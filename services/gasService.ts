
import { LibraryItem, GASResponse, ExtractionResult } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

/**
 * Memicu setup database di Google Sheets (membuat sheet & header).
 */
export const initializeDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'setupDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const fetchLibrary = async (): Promise<LibraryItem[]> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary`);
    if (!response.ok) return [];
    const result: GASResponse<LibraryItem[]> = await response.json();
    return result.data || [];
  } catch (error) {
    return [];
  }
};

export const callAiProxy = async (provider: 'groq' | 'gemini', prompt: string, modelOverride?: string): Promise<string> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('GAS_WEB_APP_URL not configured');

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiProxy', 
        provider, 
        prompt, 
        modelOverride 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GAS HTTP Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success' && result.data) {
      return result.data;
    }
    
    throw new Error(result?.message || 'AI Proxy failed to return data.');
  } catch (error: any) {
    console.error(`AI Proxy Error Details (${provider}):`, error);
    return '';
  }
};

export const fetchAiConfig = async (): Promise<{ model: string }> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getAiConfig`);
    const result: GASResponse<{ model: string }> = await response.json();
    return result.data || { model: 'gemini-3-flash-preview' };
  } catch (error) {
    return { model: 'gemini-3-flash-preview' };
  }
};

export const uploadAndStoreFile = async (file: File): Promise<ExtractionResult | null> => {
  try {
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

    return {
      ...rawData,
      fileId,
      aiSnippet: rawData.aiSnippet || (rawData.chunks?.[0] || "")
    } as ExtractionResult;

  } catch (error: any) {
    console.error('Storage Error:', error);
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
