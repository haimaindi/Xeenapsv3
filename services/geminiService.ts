
import { GoogleGenAI } from "@google/genai";

/**
 * Fix: Use 'gemini-3-flash-preview' for Basic Text Tasks (summarization/categorization) 
 * as recommended in the SDK guidelines for optimal reasoning and response quality.
 */
export const summarizeContent = async (title: string, content: string): Promise<string> => {
  // Always use a new instance to capture the latest selected API key from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this PKM item titled "${title}". 
      Content: ${content.substring(0, 5000)}
      Provide a very concise summary (max 2 sentences) highlighting key points. 
      Output only the summary text.`,
    });
    
    // Using .text property directly as per SDK guidelines.
    return response.text || 'No summary generated.';
  } catch (error: any) {
    console.error('AI Summarization Error:', error);
    // If the request fails with "Requested entity was not found.", reset key selection state and prompt for a new key.
    if (error?.message?.includes('Requested entity was not found')) {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
    }
    return 'AI processing failed';
  }
};

export const suggestTags = async (title: string, content: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this title: "${title}" and content: "${content.substring(0, 1000)}".
      Suggest exactly 5 relevant short tags for categorization. 
      Output only the tags separated by commas, no other text.`,
    });
    
    const text = response.text;
    if (!text) return [];
    
    return text.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length < 20);
  } catch (error: any) {
    console.error('AI Tag Suggestion Error:', error);
    if (error?.message?.includes('Requested entity was not found')) {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
    }
    return [];
  }
};
