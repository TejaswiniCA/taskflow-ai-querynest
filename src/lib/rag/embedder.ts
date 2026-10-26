import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

function getApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error('Google Gemini API Key is not set in environment variables.');
  }
  return key;
}

/**
 * Embeds a single query or passage string using Gemini embedding-001.
 */
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  try {
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType,
    });
    return result.embedding.values;
  } catch {
    console.error('Gemini embedding generation failed.');
    throw new Error('Failed to generate embeddings.');
  }
}

/**
 * Embeds multiple chunk texts with batching.
 */
export async function embedBatch(
  texts: string[],
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[][]> {
  const results: number[][] = [];
  // Batch in chunks of 5 with small delay to respect free rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const batchEmbeddings = await Promise.all(
      batch.map(t => embedText(t, taskType))
    );
    results.push(...batchEmbeddings);
    if (i + 5 < texts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}
