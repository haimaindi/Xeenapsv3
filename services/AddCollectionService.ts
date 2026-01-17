
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction Only.
 * Fokus pada akurasi identifikasi metadata dasar dari snippet teks (max 5000 chars).
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const prompt = `ACT AS AN EXPERT ACADEMIC LIBRARIAN.
    TASK: Extract fundamental metadata from the provided document text snippet.
    
    GUIDELINES:
    1. Title: Identify the full official title of the document.
    2. Authors: Carefully identify ALL authors. Return them as a clean array of individual names. Ensure proper spacing between first and last names.
    3. Year: Extract the publication year (YYYY).
    4. Publisher: Identify the Journal name, University, or Publishing House.
    5. Type: Select the most appropriate from ["Literature", "Task", "Personal", "Other"].
    6. Category: Identify the document category (e.g., Original Research, Case Study, Handbook, Review).
    7. Topic: Determine a broad scientific or professional topic.
    8. Sub-Topic: Identify a specific area within that topic.
    9. Keywords: Generate exactly 5-7 keywords. Each must be a single concept, properly formatted with spaces.
    10. Labels: Generate 2-3 thematic labels.
    
    IMPORTANT: 
    - Identify names accurately. Do not truncate.
    - Return ONLY valid JSON.
    - DO NOT include abstract, methodology, or citations in this stage.
    
    EXPECTED JSON SCHEMA:
    {
      "title": "String",
      "authors": ["Author Name 1", "Author Name 2"],
      "year": "YYYY",
      "publisher": "String",
      "type": "Literature",
      "category": "String",
      "topic": "String",
      "subTopic": "String",
      "keywords": ["tag1", "tag2"],
      "labels": ["label1", "label2"]
    }
    
    TEXT SNIPPET:
    ${textSnippet.substring(0, 5000)}`;

    const jsonResponse = await callAiProxy('groq', prompt);
    
    if (!jsonResponse) return {};
    
    const parsed = JSON.parse(jsonResponse);
    return parsed;
  } catch (error) {
    console.error('Metadata Extraction Failed:', error);
    return {};
  }
};
