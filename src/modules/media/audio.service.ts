import axios from 'axios';
import { transcribeAudio } from '../ai/openai.service';
import { logger } from '../../utils/logger';

export async function processAudioFromUrl(audioUrl: string, mimeType = 'audio/ogg'): Promise<string> {
  try {
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const buffer = Buffer.from(response.data);
    const transcript = await transcribeAudio(buffer, mimeType);
    logger.info({ audioUrl }, 'Áudio transcrito');
    return transcript || '[Áudio não compreendido]';
  } catch (err) {
    logger.error({ err, audioUrl }, 'Erro ao transcrever áudio');
    return '[Áudio recebido]';
  }
}
