import { DocumentItem } from './types';

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-q3-financials',
    title: 'Q3 Financial Performance Report',
    filename: 'Q3_Financial_Performance_Report.pdf',
    sizeBytes: 2450000,
    pageCount: 16,
    uploadedAt: 'Today, 2:45 PM',
    suggestedQuestions: [
      'What was the total ARR growth rate in Q3?',
      'How did customer acquisition cost (CAC) trend compared to Q2?',
      'What are the primary churn drivers identified in Section 4?',
      'Summarize the revenue projections for Q4.',
    ],
    initialMessages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'What was the overall ARR and revenue growth for Q3, and what contributed to it?',
        createdAt: '2:46 PM',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Based on the financial summary in Section 2, here are the key highlights for **Q3**:

- **Annual Recurring Revenue (ARR)** reached **$48.2M**, representing a **32% year-over-year increase** ($36.5M in Q3 prior year).
- **Net New ARR** added in the quarter was **$4.1M**, driven primarily by enterprise tier expansion.
- **Gross Margin** improved from **78.4% to 81.2%**, attributed to cloud infrastructure optimization and reduced egress bandwidth expenses.

The primary growth catalyst was a **44% expansion** in multi-year enterprise contracts, specifically within the healthcare and financial technology verticals.`,
        createdAt: '2:46 PM',
        citations: [
          {
            id: 'cit-1',
            pageNumber: 3,
            sectionTitle: 'Executive Summary: Financial Highlights',
            snippet: 'Total ARR concluded at $48.2M (+32% YoY). Net new ARR contributed $4.1M during the 90-day cycle, outpacing conservative guidance of $3.6M. Enterprise renewals demonstrated a 118% net revenue retention (NRR) rate.',
            score: 0.94,
          },
          {
            id: 'cit-2',
            pageNumber: 7,
            sectionTitle: 'Gross Margin & Infrastructure COGS',
            snippet: 'Consolidated Gross Margin increased 280 bps to 81.2%. Direct cloud hosting expenditures dropped by 6.4% relative to top-line growth following the migration to reserved compute instances and database tier consolidation.',
            score: 0.89,
          },
        ],
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Were there any specific customer retention metrics mentioned?',
        createdAt: '2:48 PM',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Yes, customer retention metrics are detailed in **Section 3.4 (Cohort Retention)**:

1. **Net Revenue Retention (NRR)**: Reached **118%**, an increase from 114% in Q2.
2. **Gross Revenue Retention (GRR)**: Remained stable at **94.6%**, well above the B2B SaaS benchmark of 90%.
3. **Logo Churn**: Monthly logo churn fell to **0.62%** (down from 0.78% in Q2), with mid-market accounts showing the highest loyalty.

The report notes that customers adopting two or more platform modules showed a **99.1% renewal rate**.`,
        createdAt: '2:48 PM',
        citations: [
          {
            id: 'cit-3',
            pageNumber: 5,
            sectionTitle: 'Customer Retention & Cohort Performance',
            snippet: 'Net Revenue Retention for the trailing twelve months (TTM) closed at 118%. Gross Revenue Retention registered at 94.6%. The multi-product adoption initiative launched in Q1 resulted in a 99.1% renewal rate for tiered accounts.',
            score: 0.96,
          },
        ],
      },
    ],
  },
  {
    id: 'doc-cache-spec',
    title: 'Distributed Cache Architecture Spec',
    filename: 'Distributed_Cache_Architecture_Spec.pdf',
    sizeBytes: 1850000,
    pageCount: 10,
    uploadedAt: 'Yesterday, 11:20 AM',
    suggestedQuestions: [
      'What eviction policy is used by the cache nodes?',
      'How does the replication protocol handle network partitions?',
      'What is the maximum allowed read latency SLA?',
      'Show me the client connection handshake code example.',
    ],
    initialMessages: [
      {
        id: 'msg-c1',
        role: 'user',
        content: 'What eviction algorithm does the cluster utilize and how are warm keys protected?',
        createdAt: '11:21 AM',
      },
      {
        id: 'msg-c2',
        role: 'assistant',
        content: `According to Section 4.2 of the technical specification, the cluster utilizes a **Segmented LRU (S-LRU)** eviction strategy:

- **Probationary Segment (20% capacity)**: New incoming keys enter here first. If accessed again before eviction, they get promoted to the protected segment.
- **Protected Segment (80% capacity)**: High-frequency keys remain protected from sudden large-scale cache scans or single-touch cache pollution.
- Eviction only occurs from the probationary segment when total heap thresholds cross 90%.

\`\`\`typescript
// Memory allocator eviction threshold check
if (currentHeapUsage > MAX_HEAP_THRESHOLD * 0.90) {
  probationaryQueue.evictTail({ batchSize: 64 });
}
\`\`\`
`,
        createdAt: '11:21 AM',
        citations: [
          {
            id: 'cit-c1',
            pageNumber: 4,
            sectionTitle: 'Section 4.2 — Cache Eviction & Memory Bounds',
            snippet: 'The caching layer deploys Segmented LRU (S-LRU) splitting RAM into probationary (20%) and protected (80%) rings. Scan-resistance is verified against 10M synthetic random key traversals without flushing active working sets.',
            score: 0.95,
          },
        ],
      },
    ],
  },
];
