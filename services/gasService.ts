
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

const checkConfig = () => {
  if (!GAS_WEB_APP_URL) {
    Swal.fire({
      title: 'Configuration Missing',
      text: 'VITE_GAS_URL is not set in environment variables.',
      icon: 'error'
    });
    return false;
  }
  return true;
};

export const fetchLibrary = async (): Promise<LibraryItem[]> => {
  if (!checkConfig()) return [];
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary`, {
      method: 'GET',
      mode: 'cors',
    });
    const result: GASResponse<LibraryItem[]> = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('GAS Fetch Error:', error);
    return [];
  }
};

export const uploadAndExtract = async (file: File): Promise<ExtractionResult | null> => {
  if (!checkConfig()) return null;
  
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  const fileData = await base64Promise;

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'uploadAndExtract', 
        fileData, 
        fileName: file.name 
      }),
    });
    const result: GASResponse<ExtractionResult> = await response.json();
    if (result.status === 'success') {
      return result.data || null;
    }
    throw new Error(result.message || 'Unknown extraction error');
  } catch (error) {
    console.error('Extraction Error:', error);
    return null;
  }
};

export const saveLibraryItem = async (item: LibraryItem): Promise<boolean> => {
  if (!checkConfig()) return false;
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
  if (!checkConfig()) return false;
  const confirm = await Swal.fire({
    title: 'Delete Item?',
    text: "This action cannot be undone.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#004A74',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete!'
  });

  if (!confirm.isConfirmed) return false;

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteItem', id }),
    });
    const result: GASResponse<any> = await response.json();
    if (result.status === 'success') {
      Toast.fire({ icon: 'success', title: 'Deleted successfully' });
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};
