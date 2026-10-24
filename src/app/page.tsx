'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { CitationDrawer } from '@/components/chat/citation-drawer';
import { LandingHero } from '@/components/landing/landing-hero';
import { MOCK_DOCUMENTS } from '@/lib/mock-data';
import { DocumentItem, ChatMessage, Citation } from '@/lib/types';

export default function AskGuruPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(MOCK_DOCUMENTS);
  const [activeDocId, setActiveDocId] = useState<string | null>(MOCK_DOCUMENTS[0].id);
  const [documentMessages, setDocumentMessages] = useState<Record<string, ChatMessage[]>>({
    [MOCK_DOCUMENTS[0].id]: MOCK_DOCUMENTS[0].initialMessages,
    [MOCK_DOCUMENTS[1].id]: MOCK_DOCUMENTS[1].initialMessages,
  });
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeDocument = documents.find(d => d.id === activeDocId) || null;
  const currentMessages = (activeDocId && documentMessages[activeDocId]) || [];

  const handleSelectDocument = (doc: DocumentItem) => {
    setActiveDocId(doc.id);
    if (!documentMessages[doc.id]) {
      setDocumentMessages(prev => ({
        ...prev,
        [doc.id]: doc.initialMessages || [],
      }));
    }
  };

  const handleNewChat = () => {
    setActiveDocId(null);
  };

  const handleDocumentAdded = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setDocumentMessages(prev => ({
      ...prev,
      [newDoc.id]: [],
    }));
  };

  const handleSendMessage = (userText: string) => {
    if (!activeDocId) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      createdAt: 'Just now',
    };

    // Append user message immediately
    setDocumentMessages(prev => ({
      ...prev,
      [activeDocId]: [...(prev[activeDocId] || []), newUserMessage],
    }));

    setIsGenerating(true);

    // Simulate realistic RAG retrieval & response generation (Phase 1 mock)
    setTimeout(() => {
      const activeDoc = documents.find(d => d.id === activeDocId);
      const isFin = activeDoc?.id === 'doc-q3-financials';

      const mockCitation: Citation = isFin
        ? {
            id: `cit-${Date.now()}`,
            pageNumber: 8,
            sectionTitle: 'Operational Expenditure & Unit Economics',
            snippet:
              'Blended customer acquisition cost (CAC) dropped to $14,200 from $16,800 in Q2. Payback period reduced to 11.2 months as inbound organic demo conversions increased by 28%.',
            score: 0.93,
          }
        : {
            id: `cit-${Date.now()}`,
            pageNumber: 6,
            sectionTitle: 'Section 6.1 — Partition Recovery & Heartbeats',
            snippet:
              'In the event of network partition, minority partitions reject write quorums with ErrPartitionIsolated while remaining available for dirty reads up to the configured stale_read_max_ms ceiling.',
            score: 0.91,
          };

      const aiResponseContent = isFin
        ? `According to **Page 8 (Unit Economics)** of the financial report:

- **Customer Acquisition Cost (CAC)** improved significantly, decreasing from **$16,800 in Q2** down to **$14,200 in Q3** (a **15.5% efficiency gain**).
- **CAC Payback Period** contracted from **13.4 months** to **11.2 months**, outperforming internal forecasts.
- The primary contributor was a **28% boost in inbound organic conversions** driven by developer documentation and community growth.`
        : `According to **Page 6 (Partition Recovery)** of the architecture specification:

- The system handles network partitions by strictly enforcing write quorums.
- Minority partitions reject write operations with an \`ErrPartitionIsolated\` status code.
- Stale read requests are permissible up to the configured \`stale_read_max_ms\` threshold (default: 250ms), ensuring maximum read availability without violating linearizability guarantees.`;

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponseContent,
        createdAt: 'Just now',
        citations: [mockCitation],
      };

      setDocumentMessages(prev => ({
        ...prev,
        [activeDocId]: [...(prev[activeDocId] || []), aiMessage],
      }));
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDocument={handleSelectDocument}
        onDocumentAdded={handleDocumentAdded}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatHeader
          activeDocument={activeDocument}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeDocId && activeDocument ? (
            <ChatPanel
              document={activeDocument}
              messages={currentMessages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onCitationClick={citation => setActiveCitation(citation)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <LandingHero
                onUploadClick={() => setIsSidebarOpen(true)}
                onExploreDemo={() => handleSelectDocument(documents[0])}
              />
            </div>
          )}
        </main>
      </div>

      {/* Citation Inspector Side Drawer */}
      <CitationDrawer
        isOpen={activeCitation !== null}
        onClose={() => setActiveCitation(null)}
        citation={activeCitation}
        documentTitle={activeDocument?.title || 'Active Document'}
      />
    </div>
  );
}
