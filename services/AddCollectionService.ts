
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction via AI Proxy.
 * Optimized for COMPLETE and ROBUST academic citations across 3 styles.
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const truncatedSnippet = textSnippet.substring(0, 2500);

    const prompt = `ACT AS AN EXPERT SENIOR ACADEMIC LIBRARIAN. 
    EXTRACT DATA FROM THE PROVIDED PDF TEXT AND RETURN IN RAW JSON FORMAT ONLY.

    CRITICAL INSTRUCTION FOR ROBUSTNESS (NON-NEGOTIABLE):
    1. COMPLETE FIELDS (DO NOT SHORTEN/TRUNCATE):
       - "title": Must be the full, official academic title.
       - "authors": Must be a list of all full names found.
       - "publisher": Must be the full journal or publisher name.
       - "bibAPA", "bibHarvard", "bibChicago": These MUST be complete bibliographic entries. Include full titles, full journal names, volume, issue, page ranges, and DOI/URL. NEVER use "..." or "et al." unless the source has too many authors to list. NEVER summarize the title within the citation.
    
    2. CONCISE FIELDS (STRICT LIMITS):
       - "topic": Exactly 2 words describing the main field.
       - "subTopic": Exactly 2 words describing the specific niche.
       - "summary": Max 2-3 concise sentences.

    3. STYLE COMPLIANCE: 
       - inTextAPA: (Author, Year)
       - inTextHarvard: (Author, Year)
       - inTextChicago: (Author Year)

    DATA MAPPING RULES:
    - LISTS: Fields (strength, weakness, unfamiliarTerminology, supportingReferences) must use numbered format: 1., 2., 3.
    - TYPE: Leave this field out of the JSON.

    EXPECTED JSON SCHEMA:
    {
      "title": "Full Academic Title",
      "authors": ["Full Name 1", "Full Name 2"],
      "year": "YYYY",
      "publisher": "Full Journal Name",
      "category": "e.g., Original Research",
      "topic": "Two Words",
      "subTopic": "Two Words",
      "keywords": ["k1", "k2", "k3", "k4", "k5"],
      "labels": ["L1", "L2", "L3"],
      "inTextAPA": "...",
      "inTextHarvard": "...",
      "inTextChicago": "...",
      "bibAPA": "STRICTLY COMPLETE APA ENTRY",
      "bibHarvard": "STRICTLY COMPLETE HARVARD ENTRY",
      "bibChicago": "STRICTLY COMPLETE CHICAGO ENTRY",
      "abstract": "...",
      "summary": "Concise summary",
      "strength": "1. ...\n2. ...",
      "weakness": "1. ...\n2. ...",
      "unfamiliarTerminology": "1. ...\n2. ...",
      "supportingReferences": "1. ...\n2. ...",
      "quickTipsForYou": "..."
    }

    TEXT SNIPPET TO ANALYZE:
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
      const parsed = JSON.parse(cleanJson);
      // Ensure we don't return anything that might overwrite manually filled fields with empty strings
      return Object.fromEntries(Object.entries(parsed).filter(([_, v]) => v != null && v !== ""));
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return {};
    }
  } catch (error) {
    console.error('Extraction Failed:', error);
    return {};
  }
};
