import axios from 'axios';
import { config } from '../../config';
import { transcribeAudio, analyzeImage } from '../ai/openai.service';
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
      `INSERT INTO midias (client_id, message_id, media_type, original_url, storage_path, public_url, mime_type, transcription)
       VALUES ($1, $2, 'audio', $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [clientId, messageId, audioUrl, storagePath, publicUrl, mimeType, transcription]
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
  messageId: string
): Promise<string> {
  try {
    const analysis = await analyzeImage(imageUrl);

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
        `INSERT INTO midias (client_id, message_id, media_type, original_url, storage_path, public_url, mime_type, ai_analysis)
         VALUES ($1, $2, 'image', $3, $4, $5, 'image/jpeg', $6)
         ON CONFLICT DO NOTHING`,
        [clientId, messageId, imageUrl, storagePath, publicUrl, analysis]
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
        `INSERT INTO midias (client_id, message_id, media_type, original_url, storage_path, mime_type)
         VALUES ($1, $2, 'document', $3, $4, 'application/pdf')
         ON CONFLICT DO NOTHING`,
        [clientId, messageId, documentUrl, storagePath]
      );
    }
    return `[documento recebido: ${fileName}]`;
  } catch (err) {
    logger.error({ err, clientId }, 'Erro ao processar documento');
    return '[documento recebido]';
  }
}
