
export enum SourceType {
  LINK = 'LINK',
  FILE = 'FILE',
  NOTE = 'NOTE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO'
}

export enum FileFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  MD = 'MD',
  MP4 = 'MP4',
  URL = 'URL',
  EPUB = 'EPUB'
}

export enum LibraryType {
  LITERATURE = 'Literature',
  TASK = 'Task',
  PERSONAL = 'Personal',
  OTHER = 'Other'
}

export interface LibraryItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Basic & Display Fields
  title: string;
  type: LibraryType;
  category: string;
  topic: string;
  subTopic: string;
  author: string; // Display string for table
  authors: string[]; // Multi-author list
  publisher: string;
  year: string;
  
  // Collection Info
  addMethod: 'LINK' | 'FILE';
  source: SourceType;
  format: FileFormat;
  url?: string;
  fileId?: string; // Drive file ID
  
  // Tags & Labels
  keywords: string[];
  labels: string[];
  tags: string[]; // For backward compatibility / general tagging
  
  // Citations
  inTextCitation?: string;
  bibCitation?: string;
  
  // Large Data Handling
  content?: string;
  extractedInfo1?: string;
  extractedInfo2?: string;
  extractedInfo3?: string;
  extractedInfo4?: string;
  extractedInfo5?: string;
  
  // UI States
  isFavorite?: boolean;
  isBookmarked?: boolean;
}

export interface GASResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface ExtractionResult {
  title?: string;
  authors?: string[];
  publisher?: string;
  year?: string;
  keywords?: string[];
  fullText?: string;
  chunks?: string[];
  type?: LibraryType;
  category?: string;
  fileId?: string;
  // Added fields to support metadata refinement and resolve type errors in LibraryForm
  topic?: string;
  subTopic?: string;
  labels?: string[];
  aiSnippet?: string;
}

export type ViewState = 'LIBRARY' | 'ADD_ITEM' | 'SETTINGS' | 'AI_CHAT';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
