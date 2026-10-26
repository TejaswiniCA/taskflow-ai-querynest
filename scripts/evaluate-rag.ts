import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'fs';
import path from 'path';
import { extractTextPerPage } from '../src/lib/rag/extractor';
import { chunkPages } from '../src/lib/rag/chunker';
import { embedBatch, embedText } from '../src/lib/rag/embedder';
import { rankVectors } from '../src/lib/rag/vector-search';
import { TaskType } from '@google/generative-ai';

interface BenchmarkQuestion {
  id: number;
  question: string;
  expectedPages: number[];
  category: string;
}

const BENCHMARK_QUESTIONS: BenchmarkQuestion[] = [
  {
    id: 1,
    question: 'What is the exact mathematical formula for Scaled Dot-Product Attention?',
    expectedPages: [4],
    category: 'Architecture Math',
  },
  {
    id: 2,
    question: 'How many identical layers (N) are stacked in the encoder and decoder?',
    expectedPages: [3],
    category: 'Architecture Structure',
  },
  {
    id: 3,
    question: 'What specific GPU hardware was used to train the base model and for how long?',
    expectedPages: [7],
    category: 'Training Hardware',
  },
  {
    id: 4,
    question: 'What BLEU score did the big Transformer achieve on the WMT 2014 English-to-German task?',
    expectedPages: [8, 9],
    category: 'Evaluation Results',
  },
  {
    id: 5,
    question: 'How does positional encoding make use of sine and cosine functions of different frequencies?',
    expectedPages: [5, 6],
    category: 'Positional Encodings',
  },
  {
    id: 6,
    question: 'How does self-attention compare to recurrent and convolutional layers in maximum path length and complexity?',
    expectedPages: [6, 7],
    category: 'Complexity Analysis',
  },
  {
    id: 7,
    question: 'What optimizer settings and beta hyperparameters were chosen during training?',
    expectedPages: [7, 8],
    category: 'Hyperparameters',
  },
  {
    id: 8,
    question: 'What value was used for label smoothing regularization during training?',
    expectedPages: [8],
    category: 'Regularization',
  },
  {
    id: 9,
    question: 'What prior architectures such as ByteNet or ConvS2S are cited in the background section?',
    expectedPages: [2],
    category: 'Related Work',
  },
  {
    id: 10,
    question: 'What is the main thesis proposing to replace recurrent neural networks entirely with attention?',
    expectedPages: [1, 2],
    category: 'Abstract & Overview',
  },
];

async function runBenchmark() {
  console.log('='.repeat(70));
  console.log('  QueryNest RAG Retrieval Benchmark (10 Verification Queries)');
  console.log('='.repeat(70));

  const pdfPath = path.join(__dirname, '../docs/sample_document.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Sample PDF not found at ${pdfPath}`);
  }

  console.log('\n[1/4] Extracting text per page from PDF...');
  const buffer = fs.readFileSync(pdfPath);
  const pages = await extractTextPerPage(buffer, 'pdf');
  console.log(`✓ Extracted ${pages.length} pages.`);

  console.log('\n[2/4] Chunking pages (~800 tokens, 100 overlap)...');
  const chunks = chunkPages(pages, { targetTokens: 800, overlapTokens: 100 });
  console.log(`✓ Created ${chunks.length} overlapping chunks.`);

  console.log('\n[3/4] Generating Gemini vector embeddings (gemini-embedding-001)...');
  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await embedBatch(chunkTexts);
  console.log(`✓ Generated ${embeddings.length} embeddings (dimension: ${embeddings[0].length}).`);

  const indexedChunks = chunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] }));

  console.log('\n[4/4] Executing 10 Test Questions against Vector Index...\n');

  let passed = 0;
  const results: Array<{
    id: number;
    category: string;
    question: string;
    expected: string;
    retrieved: string;
    topScore: string;
    hit: 'PASS' | 'FAIL';
  }> = [];

  for (const q of BENCHMARK_QUESTIONS) {
    const queryEmb = await embedText(q.question, TaskType.RETRIEVAL_QUERY);
    const topChunks = rankVectors(indexedChunks, queryEmb, 4).map(({ item, similarity }) => ({ ...item, similarity }));

    const retrievedPages = topChunks.map(c => c.pageNumber);
    const hit = q.expectedPages.some(expected => retrievedPages.includes(expected));

    if (hit) {
      passed++;
    }

    results.push({
      id: q.id,
      category: q.category,
      question: q.question,
      expected: q.expectedPages.join(', '),
      retrieved: retrievedPages.slice(0, 4).join(', '),
      topScore: topChunks[0] ? topChunks[0].similarity.toFixed(3) : 'N/A',
      hit: hit ? 'PASS' : 'FAIL',
    });
  }

  // Display results table
  console.log('-'.repeat(80));
  console.log(
    `| #  | Category              | Expected | Retrieved (Top 4) | Top Sim | Result |`
  );
  console.log('-'.repeat(80));

  for (const r of results) {
    const idStr = String(r.id).padEnd(2);
    const catStr = r.category.padEnd(21);
    const expStr = `P.${r.expected}`.padEnd(8);
    const retStr = r.retrieved.padEnd(17);
    const simStr = r.topScore.padEnd(7);
    const hitStr = r.hit === 'PASS' ? '✅ PASS' : '❌ FAIL';

    console.log(`| ${idStr} | ${catStr} | ${expStr} | ${retStr} | ${simStr} | ${hitStr} |`);
  }
  console.log('-'.repeat(80));

  const accuracy = (passed / BENCHMARK_QUESTIONS.length) * 100;
  console.log(`\nOverall Top-4 Retrieval Accuracy: ${passed}/${BENCHMARK_QUESTIONS.length} (${accuracy.toFixed(1)}%)`);
  console.log('='.repeat(70));
}

runBenchmark().catch(err => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
