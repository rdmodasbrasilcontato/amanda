import axios from 'axios';
import { config } from '../../config';
import { transcribeAudio } from '../ai/openai.service';
import { uploadToStorage } from '../../config/supabase';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

export async function downloadMedia(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get<Buffer>(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'Client-Token': config.ZAPI_CLIENT_TOKEN },
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.error({ err, url }, 'Erro ao baixar mídia');
    return null;
  }
}

export async function processAudioMessage(
  audioUrl: string,
  clientId: string,
  messageId: string
): Promise<string> {
  const buffer = await downloadMedia(audioUrl);
  if (!buffer) return '[áudio não processado]';

  try {
    const mimeType = 'audio/ogg';
    const transcription = await transcribeAudio(buffer, mimeType);

    const storagePath = `${clientId}/${Date.now()}.ogg`;
    const publicUrl = await uploadToStorage(
      config.SUPABASE_STORAGE_BUCKET_AUDIO,
      storagePath,
      buffer,
      mimeType
    );

    await query(
      `INSERT INTO audios_recebidos
         (cliente_id, mensagem_id, audio_url, storage_path, transcricao, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, messageId, audioUrl, storagePath, transcription, mimeType]
    );

    logger.info({ clientId }, 'Áudio transcrito com sucesso');
    return transcription;
  } catch (err) {
    logger.error({ err, clientId }, 'Erro ao processar áudio');
    return '[áudio recebido mas não foi possível transcrever]';
  }
}

export async function processImageMessage(
  imageUrl: string,
  caption: string,
  clientId: string,
  messageId: string,
  descricaoIa?: string
): Promise<string> {
  try {
    const analysis = descricaoIa ?? '';

    const buffer = await downloadMedia(imageUrl);
    if (buffer) {
      const storagePath = `${clientId}/${Date.now()}.jpg`;
      const publicUrl = await uploadToStorage(
        config.SUPABASE_STORAGE_BUCKET_IMAGES,
        storagePath,
        buffer,
        'image/jpeg'
      );

      await query(
        `INSERT INTO imagens_recebidas
           (cliente_id, mensagem_id, imagem_url, storage_path, descricao_ia)
         VALUES ($1, $2, $3, $4, $5)`,
        [clientId, messageId, imageUrl, storagePath, analysis || null]
      );
    }

    const combined = [caption, analysis].filter(Boolean).join('. ');
    return combined || '[imagem enviada]';
  } catch (err) {
    logger.error({ err, clientId }, 'Erro ao processar imagem');
    return caption || '[imagem enviada]';
  }
}

export async function processDocumentMessage(
  documentUrl: string,
  fileName: string,
  clientId: string,
  messageId: string
): Promise<string> {
  try {
    const buffer = await downloadMedia(documentUrl);
    if (buffer) {
      const storagePath = `${clientId}/${Date.now()}_${fileName}`;
      await uploadToStorage(
        config.SUPABASE_STORAGE_BUCKET_DOCS,
        storagePath,
        buffer,
        'application/pdf'
      );

      await query(
        `INSERT INTO documentos_recebidos
           (cliente_id, mensagem_id, arquivo_url, storage_path, nome_arquivo, tipo_documento)
         VALUES ($1, $2, $3, $4, $5, 'pdf')`,
        [clientId, messageId, documentUrl, storagePath, fileName]
      );
    }
    return `[documento recebido: ${fileName}]`;
  } catch (err) {
    logger.error({ err, clientId }, 'Erro ao processar documento');
    return '[documento recebido]';
  }
}
