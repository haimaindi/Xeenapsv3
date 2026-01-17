
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction via Groq Proxy.
 * Optimized for multi-style academic citations and strict phrase constraints.
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const truncatedSnippet = textSnippet.substring(0, 2500);

    const prompt = `ACT AS AN EXPERT ACADEMIC RESEARCH LIBRARIAN. 
    EXTRACT DATA FROM PDF TEXT AND RETURN IN RAW JSON.

    CRITICAL RULES FOR EXTRACTION:
    1. TITLE & PUBLISHER: Fully reconstructed with spaces. Proper Case.
    2. AUTHORS: Array of strings ("First Last").
    3. TOPIC & SUB-TOPIC: MANDATORY exactly 2 words only each.
    4. CITATIONS: Generate all 6 variants:
       - inTextAPA (APA 7th, e.g., (Smith & Doe, 2024))
       - inTextHarvard (Harvard Style)
       - inTextChicago (Chicago Author-Date Style)
       - bibAPA (Full APA 7th entry)
       - bibHarvard (Full Harvard entry)
       - bibChicago (Full Chicago Author-Date entry)
    5. LIMITS: Keywords (Max 5), Labels (Max 3).
    6. NUMBERING LISTS: Fields (strength, weakness, unfamiliarTerminology, supportingReferences) must be formatted as 1., 2., 3.
    7. TYPE: DO NOT EXTRACT. LEAVE OUT.

    EXPECTED JSON SCHEMA:
    {
      "title": "Full Paper Title",
      "authors": ["Name 1", "Name 2"],
      "year": "YYYY",
      "publisher": "Full Publisher Name",
      "category": "Identify Category",
      "topic": "Two Words",
      "subTopic": "Two Words",
      "keywords": ["k1", "k2", "k3", "k4", "k5"],
      "labels": ["L1", "L2", "L3"],
      "inTextAPA": "(Parenthetical, 2024)",
      "inTextHarvard": "(Parenthetical, 2024)",
      "inTextChicago": "(Parenthetical 2024)",
      "bibAPA": "Full APA entry here",
      "bibHarvard": "Full Harvard entry here",
      "bibChicago": "Full Chicago entry here"
    }

    TEXT SNIPPET:
    ${truncatedSnippet}`;

    const response = await callAiProxy('groq', prompt);
    if (!response) return {};
    
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanJson = cleanJson.substring(start, end + 1);
    }

    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return {};
    }
  } catch (error) {
    console.error('Extraction Failed:', error);
    return {};
  }
};
