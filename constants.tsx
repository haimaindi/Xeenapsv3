
import React from 'react';
import { 
  BookOpenIcon, 
  LinkIcon, 
  DocumentTextIcon, 
  VideoCameraIcon, 
  PencilIcon 
} from '@heroicons/react/24/outline';
import { SourceType } from './types';

export const COLORS = {
  PRIMARY: '#004A74',
  SECONDARY: '#FED400',
  BACKGROUND: '#FFFFFF',
};

export const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  [SourceType.LINK]: <LinkIcon className="w-5 h-5" />,
  [SourceType.FILE]: <DocumentTextIcon className="w-5 h-5" />,
  [SourceType.NOTE]: <PencilIcon className="w-5 h-5" />,
  [SourceType.BOOK]: <BookOpenIcon className="w-5 h-5" />,
  [SourceType.VIDEO]: <VideoCameraIcon className="w-5 h-5" />,
};

/**
 * URL Web App Google Apps Script.
 * Menggunakan import.meta.env (standar Vite) agar terbaca di Vercel.
 * Pastikan VITE_GAS_URL sudah diset di dashboard Vercel.
 */
// @ts-ignore
export const GAS_WEB_APP_URL = ((import.meta as any).env?.VITE_GAS_URL as string) || '';
