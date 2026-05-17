import { analyzeClothingImage } from '../ai/openai.service';
import { logger } from '../../utils/logger';

export async function processImageFromUrl(imageUrl: string, caption?: string): Promise<string> {
  try {
    const analysis = await analyzeClothingImage(imageUrl);
    const captionSuffix = caption ? ` (legenda: "${caption}")` : '';
    return `[Imagem de roupa${captionSuffix}: ${analysis}]`;
  } catch (err) {
    logger.error({ err, imageUrl }, 'Erro ao analisar imagem');
    return caption ? `[Imagem: ${caption}]` : '[Imagem recebida]';
  }
}
