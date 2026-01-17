
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction Only.
 * Fokus pada akurasi identifikasi metadata dasar dari snippet teks.
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const prompt = `ACT AS AN EXPERT ACADEMIC LIBRARIAN.
    TASK: Extract basic metadata from the provided document text snippet.
    
    GUIDELINES:
    1. Title: Identify the full official title.
    2. Authors: Identify ALL authors. Return as a clean array of strings. 
    3. Year: Extract the publication year (YYYY).
    4. Publisher: Identify the Journal name, University, or Publishing House.
    5. Classification: Determine the most appropriate Topic, Sub-Topic, Type, and Category.
    6. Tags: Generate 5-7 specific keywords and 2-3 thematic labels.
    
    EXPECTED JSON SCHEMA:
    {
      "title": "String",
      "authors": ["Author Name 1", "Author Name 2"],
      "year": "YYYY",
      "publisher": "String",
      "type": "Literature" | "Task" | "Personal" | "Other",
      "category": "e.g., Original Research, Case Study, Handbook",
      "topic": "String (Broad Area)",
      "subTopic": "String (Specific Area)",
      "keywords": ["tag1", "tag2"],
      "labels": ["label1", "label2"]
    }
    
    TEXT SNIPPET:
    ${textSnippet.substring(0, 12000)}`;

    const jsonResponse = await callAiProxy('groq', prompt);
    
    if (!jsonResponse) return {};
    
    const parsed = JSON.parse(jsonResponse);
    return parsed;
  } catch (error) {
    console.error('Metadata Extraction Failed:', error);
    return {};
  }
};
