'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { CitationDrawer } from '@/components/chat/citation-drawer';
import { LandingHero } from '@/components/landing/landing-hero';
import { DocumentItem, ChatMessage, Citation } from '@/lib/types';

export function QueryNestWorkspace({
  userEmail,
  authMode,
}: {
  userEmail?: string | null;
  authMode?: 'local-development' | 'better-auth' | null;
}) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentChunks, setDocumentChunks] = useState<Record<string, any[]>>({});
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [documentMessages, setDocumentMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Load existing uploaded documents from API
  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          if (data.documents && data.documents.length > 0) {
            setDocuments(data.documents);
            setActiveDocId(data.documents[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    loadDocuments();
  }, []);

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

  const handleDocumentAdded = (newDoc: DocumentItem, chunks?: any[]) => {
    setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
    setActiveDocId(newDoc.id);
    if (chunks && chunks.length > 0) {
      setDocumentChunks(prev => ({
        ...prev,
        [newDoc.id]: chunks,
      }));
    }
    setDocumentMessages(prev => ({
      ...prev,
      [newDoc.id]: [],
    }));
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/documents?id=${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (activeDocId === docId) {
        setActiveDocId(null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleSendMessage = async (userText: string) => {
    if (!activeDocId || isGenerating) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const threadBefore = documentMessages[activeDocId] || [];

    // Append user message immediately
    setDocumentMessages(prev => ({
      ...prev,
      [activeDocId]: [...threadBefore, newUserMessage],
    }));

    setIsGenerating(true);

    const assistantMessageId = `ai-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: [],
    };

    setDocumentMessages(prev => ({
      ...prev,
      [activeDocId]: [...(prev[activeDocId] || []), initialAssistantMessage],
    }));

    // Build chat history summary
    const chatHistory = threadBefore
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const abortCtrl = new AbortController();
    const abortTimeout = setTimeout(() => {
      abortCtrl.abort();
    }, 28000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          documentId: activeDocId,
          question: userText,
          chatHistory,
          fallbackChunks: documentChunks[activeDocId] || [],
        }),
      });

      clearTimeout(abortTimeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response stream received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let collectedCitations: Citation[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'citations') {
              collectedCitations = data.citations || [];
              setDocumentMessages(prev => {
                const thread = prev[activeDocId] || [];
                return {
                  ...prev,
                  [activeDocId]: thread.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, citations: collectedCitations }
                      : msg
                  ),
                };
              });
            } else if (data.type === 'delta') {
              accumulatedContent += data.text;
              setDocumentMessages(prev => {
                const thread = prev[activeDocId] || [];
                return {
                  ...prev,
                  [activeDocId]: thread.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ),
                };
              });
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (jsonErr) {
            // Ignore single malformed line
          }
        }
      }
    } catch (err: any) {
      console.error('Chat generation error:', err);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const errorText = isTimeout
        ? 'The request took too long to respond. The document context is retained—please try asking your question again.'
        : (err?.message || 'I encountered an error retrieving this answer. Please verify your connection and try again.');

      setDocumentMessages(prev => {
        const thread = prev[activeDocId] || [];
        return {
          ...prev,
          [activeDocId]: thread.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: errorText,
                }
              : msg
          ),
        };
      });
    } finally {
      clearTimeout(abortTimeout);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDocument={handleSelectDocument}
        onDocumentAdded={handleDocumentAdded}
        onDeleteDocument={handleDeleteDocument}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatHeader
          activeDocument={activeDocument}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          userEmail={userEmail}
          authMode={authMode}
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
              <LandingHero onDocumentAdded={handleDocumentAdded} />
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
