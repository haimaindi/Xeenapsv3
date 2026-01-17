
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
 * Orchestrates Python Text Extraction + GAS Drive Storage.
 * Gemini is NO LONGER used here to save quota.
 */
export const uploadAndExtract = async (file: File): Promise<ExtractionResult | null> => {
  try {
    // 1. Step: Python PDF Extraction (Metadata + Text Chunks)
    const formData = new FormData();
    formData.append('file', file);
    
    const pyResponse = await fetch('/api/extract', {
      method: 'POST',
      body: formData
    });
    
    if (!pyResponse.ok) throw new Error('Python extraction failed');
    const pyResult = await pyResponse.json();
    
    if (pyResult.status !== 'success') throw new Error(pyResult.message);
    const extractionData = pyResult.data;

    // 2. Step: Upload to Drive via GAS (To get fileId for storage)
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
      ...extractionData,
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
