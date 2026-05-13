import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { sleep, generateTypingDelay, retryWithBackoff, splitIntoBalloons } from '../../utils/helpers';

// Monta a URL base completa com instanceId e token no path. A Z-API exige:
// https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text
// Se o usuário já incluir o path completo no .env, não duplicamos.
function buildZapiBaseUrl(): string {
  const raw = (config.ZAPI_BASE_URL || 'https://api.z-api.io').replace(/\/+$/, '');
  if (raw.includes('/instances/') && raw.includes('/token/')) {
    return raw;
  }
  return `${raw}/instances/${config.ZAPI_INSTANCE_ID}/token/${config.ZAPI_TOKEN}`;
}

const ZAPI_FULL_BASE_URL = buildZapiBaseUrl();

logger.info({ baseURL: ZAPI_FULL_BASE_URL }, 'Z-API client inicializado');

const zapiClient: AxiosInstance = axios.create({
  baseURL: ZAPI_FULL_BASE_URL,
  headers: {
    'Client-Token': config.ZAPI_CLIENT_TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

zapiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error(
      { status: err.response?.status, data: err.response?.data, url: err.config?.url },
      'Z-API request failed'
    );
    return Promise.reject(err);
  }
);

export async function sendTextMessage(phone: string, text: string): Promise<string | null> {
  try {
    const response = await retryWithBackoff(
      () =>
        zapiClient.post('/send-text', {
          phone,
          message: text,
          delayMessage: config.ZAPI_TYPING_DELAY_MS,
        }),
      3,
      2000
    );

    if (response.data?.error) {
      logger.error(
        { phone, responseData: response.data, status: response.status },
        'Z-API aceitou request mas retornou erro no body'
      );
      return null;
    }

    logger.info(
      {
        phone,
        zaapId: response.data?.zaapId,
        messageId: response.data?.messageId,
      },
      'Mensagem texto enviada via Z-API'
    );
    return response.data?.zaapId ?? null;
  } catch (err: any) {
    logger.error(
      {
        phone,
        status: err.response?.status,
        responseData: err.response?.data,
        message: err.message,
      },
      'Erro ao enviar texto via Z-API'
    );
    return null;
  }
}

export async function sendTextWithTyping(phone: string, text: string): Promise<string | null> {
  const delay = generateTypingDelay(text.length);
  await sendTyping(phone);
  await sleep(delay);
  return sendTextMessage(phone, text);
}

export async function sendBalloonsWithTyping(
  phone: string,
  text: string
): Promise<Array<string | null>> {
  const balloons = splitIntoBalloons(text);
  if (balloons.length === 0) return [];

  const ids: Array<string | null> = [];
  for (const balloon of balloons) {
    const id = await sendTextWithTyping(phone, balloon);
    ids.push(id);
    await sleep(600);
  }
  return ids;
}

export async function sendTyping(phone: string): Promise<void> {
  try {
    await zapiClient.post('/send-chat-state', { phone, chatState: 'typing' });
  } catch {
    // ignorar falha no typing indicator
  }
}

export async function sendImageMessage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<string | null> {
  try {
    const response = await retryWithBackoff(
      () =>
        zapiClient.post('/send-image', {
          phone,
          image: imageUrl,
          caption: caption ?? '',
          delayMessage: config.ZAPI_TYPING_DELAY_MS,
        }),
      3,
      2000
    );
    logger.info({ phone }, 'Imagem enviada via Z-API');
    return response.data?.zaapId ?? null;
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao enviar imagem via Z-API');
    return null;
  }
}

export async function sendAudioMessage(
  phone: string,
  audioBuffer: Buffer,
  mimeType = 'audio/mp3'
): Promise<string | null> {
  try {
    const base64 = audioBuffer.toString('base64');
    const response = await retryWithBackoff(
      () =>
        zapiClient.post('/send-audio', {
          phone,
          audio: `data:${mimeType};base64,${base64}`,
          delayMessage: config.ZAPI_TYPING_DELAY_MS,
        }),
      3,
      2000
    );
    logger.info({ phone }, 'Áudio enviado via Z-API');
    return response.data?.zaapId ?? null;
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao enviar áudio via Z-API');
    return null;
  }
}

export async function sendDocumentMessage(
  phone: string,
  documentUrl: string,
  fileName: string,
  caption?: string
): Promise<string | null> {
  try {
    const response = await retryWithBackoff(
      () =>
        zapiClient.post('/send-document/url', {
          phone,
          documentUrl,
          fileName,
          caption: caption ?? '',
          delayMessage: config.ZAPI_TYPING_DELAY_MS,
        }),
      3,
      2000
    );
    return response.data?.zaapId ?? null;
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao enviar documento via Z-API');
    return null;
  }
}

export async function sendButtonsMessage(
  phone: string,
  text: string,
  buttons: Array<{ id: string; label: string }>
): Promise<string | null> {
  try {
    const response = await zapiClient.post('/send-button-list', {
      phone,
      message: text,
      buttonList: {
        buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.label } })),
      },
    });
    return response.data?.zaapId ?? null;
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao enviar botões via Z-API');
    return null;
  }
}

export async function markMessageAsRead(phone: string, messageId: string): Promise<void> {
  try {
    await zapiClient.post('/read-message', { phone, messageId });
  } catch {
    // ignorar falha
  }
}

export async function getInstanceStatus(): Promise<Record<string, unknown>> {
  try {
    const response = await zapiClient.get('/status');
    return response.data;
  } catch {
    return { connected: false };
  }
}

export async function getQRCode(): Promise<string | null> {
  try {
    const response = await zapiClient.get('/qr-code/image');
    return response.data?.value ?? null;
  } catch {
    return null;
  }
}
