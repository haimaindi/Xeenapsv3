
import { LibraryItem, GASResponse, ExtractionResult } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { parseLibraryMetadata } from './geminiService';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const fetchLibrary = async (): Promise<LibraryItem[]> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary`);
    const result: GASResponse<LibraryItem[]> = await response.json();
    return result.data || [];
  } catch (error) {
    return [];
  }
};

/**
 * Hybrid Extraction:
 * 1. Python extracts raw text and chunks.
 * 2. Gemini parses the first few KB for perfect metadata.
 * 3. GAS handles the file storage.
 */
export const uploadAndExtract = async (file: File): Promise<ExtractionResult | null> => {
  try {
    // Phase 1: Python PDF Text Extraction
    const formData = new FormData();
    formData.append('file', file);
    
    const pyResponse = await fetch('/api/extract', {
      method: 'POST',
      body: formData
    });
    
    if (!pyResponse.ok) throw new Error('Text extraction failed');
    const pyResult = await pyResponse.json();
    if (pyResult.status !== 'success') throw new Error(pyResult.message);
    
    const rawData = pyResult.data;
    const textSnippet = rawData.chunks[0] || ""; // Grab the first chunk for AI analysis

    // Phase 2: AI Metadata Refinement (Using Gemini)
    // We send a small snippet to Gemini for perfect parsing
    let refinedMetadata = {};
    try {
      refinedMetadata = await parseLibraryMetadata(textSnippet);
    } catch (aiErr) {
      console.warn("AI Refinement failed, falling back to heuristics:", aiErr);
    }

    // Phase 3: Google Drive Upload via GAS
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    const fileData = await base64Promise;

    const gasResponse = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'uploadOnly', 
        fileData, 
        fileName: file.name 
      }),
    });
    const gasResult = await gasResponse.json();
    const fileId = gasResult.status === 'success' ? gasResult.fileId : '';

    // Merge results: AI results take priority over Python heuristics
    return {
      ...rawData,
      ...refinedMetadata,
      fileId
    } as ExtractionResult;

  } catch (error: any) {
    console.error('Extraction Error:', error);
    throw error;
  }
};

export const saveLibraryItem = async (item: LibraryItem): Promise<boolean> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveItem', item }),
    });
    const result: GASResponse<any> = await response.json();
    if (result.status === 'success') {
      Toast.fire({ 
        icon: 'success', 
        title: 'Collection saved successfully',
        background: '#004A74',
        color: '#FFFFFF',
        iconColor: '#FED400'
      });
      return true;
    }
    return false;
  } catch (error) {
    Toast.fire({ icon: 'error', title: 'Sync failed' });
    return false;
  }
};

export const deleteLibraryItem = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteItem', id }),
    });
    const result: GASResponse<any> = await response.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
};
