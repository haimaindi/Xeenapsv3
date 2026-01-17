
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService via Secure GAS Proxy.
 * Metadata extraction kini diproses sepenuhnya di backend untuk keamanan.
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const prompt = `ACT AS A SENIOR ACADEMIC DATA EXTRACTOR.
    TASK: Analyze the text and extract metadata into a strict JSON format.
    
    EXPECTED JSON SCHEMA:
    {
      "title": "string",
      "authors": ["string"],
      "publisher": "string",
      "year": "string",
      "type": "Literature" | "Task" | "Personal" | "Other",
      "category": "string",
      "topic": "string",
      "subTopic": "string",
      "keywords": ["string"],
      "labels": ["string"]
    }
    
    TEXT SNIPPET:
    ${textSnippet.substring(0, 12000)}`;

    const jsonResponse = await callAiProxy('groq', prompt);
    
    if (!jsonResponse) return {};
    
    return JSON.parse(jsonResponse);
  } catch (error) {
    console.error('Secure Extraction Workflow Failed:', error);
    return {};
  }
};
