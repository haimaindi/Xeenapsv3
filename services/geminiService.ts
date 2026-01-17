
import { callAiProxy } from "./gasService";

/**
 * Gemini Service via Secure GAS Proxy.
 * Menggunakan rotasi kunci di sisi server (GAS).
 */

export const summarizeContent = async (title: string, content: string): Promise<string> => {
  try {
    const prompt = `Summarize this PKM item titled "${title}". 
    Content: ${content.substring(0, 5000)}
    Provide a concise summary (max 2 sentences). Output only text.`;
    
    const result = await callAiProxy('gemini', prompt);
    return result || 'No summary generated.';
  } catch (error) {
    return 'AI summary unavailable at the moment.';
  }
};

export const suggestTags = async (title: string, content: string): Promise<string[]> => {
  try {
    const prompt = `Suggest exactly 5 relevant short tags for: "${title}" and "${content.substring(0, 1000)}".
    Output only tags separated by commas.`;
    
    const result = await callAiProxy('gemini', prompt);
    if (!result) return [];
    return result.split(',').map(tag => tag.trim().toLowerCase()).filter(t => t.length > 0);
  } catch (error) {
    return [];
  }
};
