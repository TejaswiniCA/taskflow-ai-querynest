import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai';
import {
  classifySuggestionFailure,
  generateSuggestedQuestionsWith,
  type SuggestionDiagnostic,
} from '../src/lib/rag/suggester';

describe('Gemini question suggestion diagnostics', () => {
  it('returns four parsed suggestions on success without logging a failure', async () => {
    const diagnostics: SuggestionDiagnostic[] = [];
    const questions = await generateSuggestedQuestionsWith(
      'Safe title',
      'Short source excerpt',
      async () => JSON.stringify(['One?', 'Two?', 'Three?', 'Four?']),
      diagnostic => diagnostics.push(diagnostic)
    );

    assert.deepEqual(questions, ['One?', 'Two?', 'Three?', 'Four?']);
    assert.deepEqual(diagnostics, []);
  });

  it('preserves generic fallback after provider timeout and logs only its category', async () => {
    const diagnostics: SuggestionDiagnostic[] = [];
    const questions = await generateSuggestedQuestionsWith(
      'Safe title',
      'Private document excerpt must not enter diagnostics',
      async () => { throw new GoogleGenerativeAIAbortError('private key and prompt text'); },
      diagnostic => diagnostics.push(diagnostic)
    );

    assert.equal(questions.length, 4);
    assert.match(questions[0], /Safe title/);
    assert.deepEqual(diagnostics, [{ category: 'timeout' }]);
    assert.equal(JSON.stringify(diagnostics).includes('private'), false);
  });

  it('classifies authentication, quota, network, and other provider errors without exposing details', () => {
    const cases: Array<[unknown, SuggestionDiagnostic]> = [
      [new GoogleGenerativeAIFetchError('sensitive response body', 401), { category: 'authentication_failure', httpStatus: 401 }],
      [new GoogleGenerativeAIFetchError('sensitive response body', 429), { category: 'rate_limit_or_quota', httpStatus: 429 }],
      [new GoogleGenerativeAIFetchError('quota details are sensitive', 403), { category: 'rate_limit_or_quota', httpStatus: 403 }],
      [new Error('Error fetching from a URL with a private key: fetch failed'), { category: 'network_error' }],
      [new GoogleGenerativeAIFetchError('sensitive provider response', 500), { category: 'provider_error', httpStatus: 500 }],
    ];

    for (const [error, expected] of cases) {
      const diagnostic = classifySuggestionFailure(error);
      assert.deepEqual(diagnostic, expected);
      assert.equal(JSON.stringify(diagnostic).includes('sensitive'), false);
    }
  });

  it('falls back and records only invalid-response category for malformed model output', async () => {
    const diagnostics: SuggestionDiagnostic[] = [];
    const questions = await generateSuggestedQuestionsWith(
      'Safe title',
      'Private excerpt',
      async () => 'not-json private output',
      diagnostic => diagnostics.push(diagnostic)
    );

    assert.equal(questions.length, 4);
    assert.deepEqual(diagnostics, [{ category: 'invalid_response' }]);
    assert.equal(JSON.stringify(diagnostics).includes('private'), false);
  });
});
