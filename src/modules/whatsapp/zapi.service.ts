import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { retryWithBackoff, sleep, splitIntoBalloons } from '../../utils/helpers';

function buildBaseUrl(): string {
  const raw = config.ZAPI_BASE_URL.replace(/\/+$/, '');
  if (raw.includes('/instances/') && raw.includes('/token/')) return raw;
  return `${raw}/instances/${config.ZAPI_INSTANCE_ID}/token/${config.ZAPI_TOKEN}`;
}

const zapiClient: AxiosInstance = axios.create({
  baseURL: buildBaseUrl(),
  headers: {
    'Client-Token': config.ZAPI_CLIENT_TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

zapiClient.interceptors.response.use(
  res => res,
  err => {
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
      () => zapiClient.post('/send-text', {
        phone,
        message: text,
        delayMessage: config.ZAPI_TYPING_DELAY_MS,
      }),
      3,
      2000
    );
    if (response.data?.error) {
      logger.error({ phone, data: response.data }, 'Z-API erro no body');
      return null;
    }
    return response.data?.zaapId ?? null;
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao enviar texto via Z-API');
    return null;
  }
}

export async function sendTyping(phone: string): Promise<void> {
  try {
    await zapiClient.post('/send-chat-state', { phone, chatState: 'typing' });
  } catch { /* silencioso */ }
}

export async function sendBalloonsWithTyping(phone: string, text: string): Promise<void> {
  const balloons = splitIntoBalloons(text);
  const msgs = balloons.length > 0 ? balloons : [text];

  for (const msg of msgs) {
    await sendTyping(phone);
    await sleep(1200 + msg.length * 25);
    await sendTextMessage(phone, msg);
    await sleep(600);
  }
}

export async function markMessageAsRead(phone: string, messageId: string): Promise<void> {
  try {
    await zapiClient.post('/read-message', { phone, messageId });
  } catch { /* silencioso */ }
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

export async function registerWebhook(publicUrl: string): Promise<boolean> {
  const webhookUrl = `${publicUrl.replace(/\/+$/, '')}/webhook/zapi`;
  try {
    await zapiClient.put('/update-webhook-received', { value: webhookUrl });
    logger.info({ webhookUrl }, '✅ Webhook registrado');
    return true;
  } catch {
    try {
      await zapiClient.put('/webhook', { value: webhookUrl });
      logger.info({ webhookUrl }, '✅ Webhook registrado (fallback)');
      return true;
    } catch {
      logger.warn({ webhookUrl }, '⚠️  Configure o webhook manualmente no painel Z-API');
      return false;
    }
  }
}
