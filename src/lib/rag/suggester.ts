import { GoogleGenerativeAI } from '@google/generative-ai';

function getApiKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  );
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
    return getDefaultQuestions(documentTitle);
  }

  const prompt = `You are an expert document analyst. Analyze this excerpt from the document titled "${documentTitle}" and generate exactly 4 concise, high-value questions that a reader would want answered based on this document.
Respond ONLY with a JSON array of 4 question strings. Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]

EXCERPT:
${sampleText.slice(0, 4000)}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length >= 4) {
      return parsed.slice(0, 4).map(q => String(q).trim());
    }
    return getDefaultQuestions(documentTitle);
  } catch {
    console.warn('AI question suggestions failed; using generic defaults.');
    return getDefaultQuestions(documentTitle);
  }
}

function getDefaultQuestions(title: string): string[] {
  return [
    `What are the core conclusions presented in ${title}?`,
    'What methodologies or strategies are outlined in the text?',
    'Are there any key metrics or numerical milestones mentioned?',
    'Summarize the primary takeaways and recommended actions.',
  ];
}
