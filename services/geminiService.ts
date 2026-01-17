
import { GoogleGenAI, Type } from "@google/genai";
import { LibraryItem, LibraryType } from "../types";

/**
 * Uses Gemini to intelligently parse structured metadata from raw text.
 */
export const parseLibraryMetadata = async (textSample: string): Promise<Partial<LibraryItem>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a research assistant. Analyze this text from a document: "${textSample.substring(0, 6000)}".
      Extract the metadata and return it in the specified JSON format. 
      If a field is unknown, return an empty string or empty array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The official title of the paper or document." },
            authors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of individual author names." },
            publisher: { type: Type.STRING, description: "Journal name, university, or publisher." },
            year: { type: Type.STRING, description: "Year of publication (YYYY)." },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 5 relevant keywords." },
            type: { type: Type.STRING, description: "Categorize as: Literature, Task, Personal, or Other." },
            category: { type: Type.STRING, description: "Categorize as: Original Research or Review." }
          },
          required: ["title", "authors", "year"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error('Gemini Parsing Error:', error);
    return {};
  }
};

export const summarizeContent = async (title: string, content: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize this PKM item titled "${title}". 
      Content: ${content.substring(0, 5000)}
      Provide a very concise summary (max 2 sentences). Output only text.`,
    });
    return response.text || 'No summary generated.';
  } catch (error) {
    return 'AI processing failed';
  }
};

export const suggestTags = async (title: string, content: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest exactly 5 relevant short tags for: "${title}" and "${content.substring(0, 1000)}".
      Output only tags separated by commas.`,
    });
    const text = response.text;
    if (!text) return [];
    return text.split(',').map(tag => tag.trim().toLowerCase()).filter(t => t.length > 0);
  } catch (error) {
    return [];
  }
};
