import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIRequestInputError,
} from '@google/generative-ai';

const AI_REQUEST_TIMEOUT_MS = 10_000;

export type SuggestionFailureCategory =
  | 'timeout'
  | 'authentication_failure'
  | 'rate_limit_or_quota'
  | 'network_error'
  | 'provider_error'
  | 'invalid_response'
  | 'missing_configuration';

export interface SuggestionDiagnostic {
  category: SuggestionFailureCategory;
  httpStatus?: number;
}

type DiagnosticLogger = (diagnostic: SuggestionDiagnostic) => void;
type TextGenerator = (prompt: string) => Promise<string>;

function getApiKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  );
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' && Number.isInteger(status) ? status : undefined;
}

function getClassificationText(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const parts: string[] = [];
  if ('message' in error && typeof error.message === 'string') parts.push(error.message);
  if ('errorDetails' in error && Array.isArray(error.errorDetails)) {
    for (const detail of error.errorDetails) {
      if (detail && typeof detail === 'object') {
        for (const value of Object.values(detail)) {
          if (typeof value === 'string') parts.push(value);
        }
      }
    }
  }
  return parts.join(' ').toLowerCase();
}

export function classifySuggestionFailure(error: unknown): SuggestionDiagnostic {
  const status = getHttpStatus(error);
  const name = error instanceof Error ? error.name : '';
  const text = getClassificationText(error);

  if (
    error instanceof GoogleGenerativeAIAbortError ||
    name === 'AbortError' ||
    name === 'TimeoutError'
  ) {
    return { category: 'timeout', ...(status ? { httpStatus: status } : {}) };
  }

  if (
    status === 429 ||
    /resource_exhausted|quota|rate.?limit|too many requests/.test(text)
  ) {
    return { category: 'rate_limit_or_quota', ...(status ? { httpStatus: status } : {}) };
  }

  if (
    status === 401 ||
    status === 403 ||
    /unauthenticated|permission denied|invalid api key|api key not valid/.test(text)
  ) {
    return { category: 'authentication_failure', ...(status ? { httpStatus: status } : {}) };
  }

  if (
    (error instanceof GoogleGenerativeAIFetchError && status === undefined) ||
    (error instanceof Error && /error fetching from|fetch failed|network error|econnreset|enotfound|eai_again|etimedout/.test(text))
  ) {
    return { category: 'network_error' };
  }

  // A locally rejected malformed request is not a provider response.
  if (error instanceof GoogleGenerativeAIRequestInputError) {
    return { category: 'provider_error' };
  }

  return { category: 'provider_error', ...(status ? { httpStatus: status } : {}) };
}

function logDiagnostic(diagnostic: SuggestionDiagnostic) {
  // Log only a fixed category and numeric HTTP status. Never print SDK errors,
  // request URLs, keys, prompts, document text, or provider response details.
  console.warn('Gemini question suggestions failed.', diagnostic);
}

function buildPrompt(documentTitle: string, sampleText: string): string {
  return `You are an expert document analyst. Analyze this excerpt from the document titled "${documentTitle}" and generate exactly 4 concise, high-value questions that a reader would want answered based on this document.
Respond ONLY with a JSON array of 4 question strings. Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]

EXCERPT:
${sampleText.slice(0, 4000)}`;
}

/** Testable generation path; production supplies the configured Gemini client. */
export async function generateSuggestedQuestionsWith(
  documentTitle: string,
  sampleText: string,
  generateText: TextGenerator,
  logger: DiagnosticLogger = logDiagnostic
): Promise<string[]> {
  let responseText: string;
  try {
    responseText = await generateText(buildPrompt(documentTitle, sampleText));
  } catch (error) {
    logger(classifySuggestionFailure(error));
    return getDefaultQuestions(documentTitle);
  }

  try {
    const parsed: unknown = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length >= 4 && parsed.slice(0, 4).every(q => typeof q === 'string' && q.trim())) {
      return parsed.slice(0, 4).map(q => (q as string).trim());
    }
  } catch {
    // Malformed or non-JSON provider output falls back without logging content.
  }
  logger({ category: 'invalid_response' });
  return getDefaultQuestions(documentTitle);
}

/**
 * Generates 4 suggested questions from document excerpts using Gemini Flash.
 */
export async function generateSuggestedQuestions(
  documentTitle: string,
  sampleText: string
): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logDiagnostic({ category: 'missing_configuration' });
    return getDefaultQuestions(documentTitle);
  }

  return generateSuggestedQuestionsWith(
    documentTitle,
    sampleText,
    async prompt => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.8-flash',
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }, { timeout: AI_REQUEST_TIMEOUT_MS });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }
  );
}

function getDefaultQuestions(title: string): string[] {
  return [
    `What are the core conclusions presented in ${title}?`,
    'What methodologies or strategies are outlined in the text?',
    'Are there any key metrics or numerical milestones mentioned?',
    'Summarize the primary takeaways and recommended actions.',
  ];
}
