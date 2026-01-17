
import { GoogleGenAI, Type } from "@google/genai";
import { LibraryItem, LibraryType } from "../types";

/**
 * Uses Gemini to intelligently parse structured metadata from raw text.
 * Optimized for Academic Papers.
 */
export const parseLibraryMetadata = async (textSample: string): Promise<Partial<LibraryItem>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ACT AS A RESEARCH LIBRARIAN. 
      Analyze the provided text from a research paper/document and extract METADATA.
      
      CRITICAL INSTRUCTIONS:
      1. TITLE: Find the full official title. If it spans multiple lines, join them. Fix broken words (e.g., "T owards" -> "Towards").
      2. AUTHORS: List ONLY names. Remove affiliations (e.g., "Dept of...").
      3. PUBLISHER: Identify the Journal name or Publishing House.
      4. YEAR: Extract publication year (4 digits).
      5. TYPE: Categorize as 'Literature', 'Task', or 'Personal'.
      6. CATEGORY: Categorize as 'Original Research' or 'Review'.

      TEXT SAMPLE:
      """
      ${textSample.substring(0, 8000)}
      """`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            authors: { type: Type.ARRAY, items: { type: Type.STRING } },
            publisher: { type: Type.STRING },
            year: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            type: { type: Type.STRING },
            category: { type: Type.STRING }
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
