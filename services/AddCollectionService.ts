
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction via AI Proxy.
 * FOCUS: Basic metadata and robust academic citations ONLY.
 * EXCLUDE: Deep insights (abstract, summary, methodology, etc.)
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const truncatedSnippet = textSnippet.substring(0, 2500);

    const prompt = `ACT AS AN EXPERT SENIOR ACADEMIC LIBRARIAN. 
    EXTRACT DATA FROM THE PROVIDED PDF TEXT AND RETURN IN RAW JSON FORMAT ONLY.

    SCOPE LIMITATION (CRITICAL):
    - DO NOT analyze or extract: researchMethodology, abstract, summary, strength, weakness, unfamiliarTerminology, supportingReferences, videoRecommendation, quickTipsForYou.
    - ONLY extract the fields defined in the JSON schema below.

    CRITICAL INSTRUCTION FOR ROBUSTNESS:
    1. COMPLETE FIELDS (DO NOT SHORTEN/TRUNCATE):
       - "title": Full, official academic title.
       - "authors": List of all full names found.
       - "publisher": Full journal or publisher name.
       - "bibAPA", "bibHarvard", "bibChicago": COMPLETE bibliographic entries. Include full titles, full journal names, volume, issue, page ranges, and DOI/URL. NEVER use "..." or summarize the title.
    
    2. CONCISE FIELDS:
       - "topic": Exactly 2 words describing the main field.
       - "subTopic": Exactly 2 words describing the specific niche.

    3. STYLE COMPLIANCE: 
       - inTextAPA: (Author, Year)
       - inTextHarvard: (Author, Year)
       - inTextChicago: (Author Year)

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
      "bibAPA": "COMPLETE APA 7th Edition Bibliographic Entry",
      "bibHarvard": "COMPLETE Harvard Style Bibliographic Entry",
      "bibChicago": "COMPLETE Chicago Author-Date Bibliographic Entry"
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
      // Filter out empty values
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
