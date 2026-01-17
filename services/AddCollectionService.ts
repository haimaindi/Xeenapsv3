
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction via Groq Proxy.
 * Menggunakan model yang dikonfigurasi di spreadsheet (contoh: llama-4-scout).
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    // Membatasi snippet ke 2500 karakter untuk efisiensi token 2-arah (kirim & terima)
    const truncatedSnippet = textSnippet.substring(0, 2500);

    const prompt = `ACT AS AN EXPERT ACADEMIC LINGUISTIC RESEARCH LIBRARIAN.
    
    TASK: Extract fundamental metadata from the provided PDF text snippet.
    
    CRITICAL INSTRUCTIONS:
    1. TEXT RECONSTRUCTION (MISSING SPACES): 
       - PDF extraction often loses spaces (e.g., 'EducationalTechnology' should be 'Educational Technology'). 
       - You MUST logically separate words that are merged together.
       - Apply this strictly to Titles, Publishers, and Author names.
    
    2. INTELLIGENT CASING (PROPER VS UPPER):
       - Use "Proper Case" (Title Case) for Title and Publisher.
       - ALWAYS maintain FULL UPPERCASE for recognized organizations or technical terms (e.g., IEEE, UNESCO, SARS, COVID, NASA, WHO, ACM, MP4, DOI, AI, IoT, STEM, UN, etc.).
       - If a title contains an acronym, keep it UPPERCASE (e.g., "Deep Learning for AI Systems" NOT "Deep Learning For Ai Systems").
    
    3. DATA INTEGRITY:
       - Fill ALL fields in the schema. Do not leave empty strings. Use context to guess Topic and Category accurately.
    
    4. AUTHORS: Standardize to "Firstname Lastname". Return as an array of strings.
    
    5. FORMAT: Return ONLY valid RAW JSON. NO markdown blocks, NO conversational text.

    EXPECTED JSON SCHEMA:
    {
      "title": "Full Reconstructed Title",
      "authors": ["Full Name 1", "Full Name 2"],
      "year": "YYYY",
      "publisher": "Reconstructed Journal/Publisher Name",
      "type": "Literature",
      "category": "e.g., Original Research",
      "topic": "Broad Scientific Area",
      "subTopic": "Specific Area",
      "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "labels": ["thematic1", "thematic2"]
    }

    TEXT SNIPPET TO ANALYZE:
    ${truncatedSnippet}`;

    // Memanggil Proxy GAS dengan provider 'groq'. 
    // Backend akan otomatis mencari model "meta-llama/llama-4-scout-17b-16e-instruct" di spreadsheet.
    const response = await callAiProxy('groq', prompt);
    
    if (!response) {
      console.warn("Groq Proxy returned empty response.");
      return {};
    }
    
    // Pembersihan sederhana jika AI masih memberikan markdown
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        cleanJson = cleanJson.substring(start, end + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleanJson);
      
      // Sanitasi tambahan pasca-ekstraksi
      if (parsed.authors && Array.isArray(parsed.authors)) {
        parsed.authors = parsed.authors.filter((a: any) => typeof a === 'string' && a.trim().length > 1);
      }
      
      return parsed;
    } catch (e) {
      console.error('Failed to parse Groq JSON response:', e, 'Raw string:', cleanJson);
      return {};
    }
  } catch (error) {
    console.error('Metadata Extraction via Groq Failed:', error);
    return {};
  }
};
