
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
  
  // Tags & Labels
  keywords: string[];
  labels: string[];
  tags: string[]; // For backward compatibility / general tagging
  
  // Citations
  inTextCitation?: string;
  bibCitation?: string;
  
  // Deep Research Metadata
  methodology?: string;
  abstract?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  unfamiliarTerms?: string[];
  supportingReferences?: string[];
  tipsForYou?: string;
  
  // Large Data Handling
  content?: string;
  extractedInfoChunks?: string[]; // For handling 50k char limit in Spreadsheet cells
  
  // UI States
  isFavorite?: boolean;
  isBookmarked?: boolean;
}

export interface GASResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
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
