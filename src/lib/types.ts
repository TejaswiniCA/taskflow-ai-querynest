export interface Citation {
  id: string;
  pageNumber: number;
  snippet: string;
  score?: number;
  sectionTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  uploadedAt: string;
  suggestedQuestions: string[];
  initialMessages: ChatMessage[];
}

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'embedding' | 'ready' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  progress: number;
  fileName?: string;
  errorMessage?: string;
}
