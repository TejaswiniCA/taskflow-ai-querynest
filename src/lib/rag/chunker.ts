import { ExtractedPage } from './extractor';

export interface DocumentChunk {
  id: string;
  documentId?: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  tokenCount: number;
}

export interface ChunkerOptions {
  targetTokens?: number; // Default 800 tokens
  overlapTokens?: number; // Default 100 tokens
}

/**
 * Estimates token count from text (rule of thumb: ~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Splits extracted pages into overlapping chunks (~800 tokens, 100 tokens overlap)
 * while preserving sentence and paragraph integrity.
 */
export function chunkPages(
  pages: ExtractedPage[],
  options: ChunkerOptions = {}
): DocumentChunk[] {
  const targetTokens = options.targetTokens ?? 800;
  const overlapTokens = options.overlapTokens ?? 100;

  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;

  const chunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // If page fits within chunk size, keep it whole
    if (pageText.length <= targetChars) {
      chunks.push({
        id: `chunk-${page.pageNumber}-${globalChunkIndex++}`,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex,
        text: pageText,
        tokenCount: estimateTokens(pageText),
      });
      continue;
    }

    // Split page into sentences
    const sentenceRegex = /([^\.!\?\n]+[\.!\?\n]+)/g;
    const sentences = pageText.match(sentenceRegex) || [pageText];

    let currentChunkSentences: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      currentChunkSentences.push(sentence);
      currentLength += sentence.length;

      if (currentLength >= targetChars || i === sentences.length - 1) {
        const chunkText = currentChunkSentences.join('').trim();
        if (chunkText.length > 0) {
          chunks.push({
            id: `chunk-${page.pageNumber}-${globalChunkIndex++}`,
            pageNumber: page.pageNumber,
            chunkIndex: globalChunkIndex,
            text: chunkText,
            tokenCount: estimateTokens(chunkText),
          });
        }

        // Calculate overlap: keep the tail sentences that fit within overlapChars
        const overlapSentences: string[] = [];
        let overlapAccumulated = 0;

        for (let j = currentChunkSentences.length - 1; j >= 0; j--) {
          const s = currentChunkSentences[j];
          if (overlapAccumulated + s.length <= overlapChars) {
            overlapSentences.unshift(s);
            overlapAccumulated += s.length;
          } else {
            break;
          }
        }

        currentChunkSentences = overlapSentences;
        currentLength = overlapAccumulated;
      }
    }
  }

  return chunks;
}
