
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService via Secure GAS Proxy.
 * Melakukan ekstraksi metadata dasar dan deep insights akademik.
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const prompt = `ACT AS A SENIOR ACADEMIC DATA EXTRACTOR & RESEARCH ANALYST.
    TASK: Analyze the provided document text snippet and extract deep metadata.
    
    IMPORTANT: Provide citations in APA 7th Edition, Harvard, and Chicago Style (Author-Date).
    For Video Recommendation, identify a highly relevant YouTube video topic and provide a likely YouTube ID if found, or suggest a search term.
    
    EXPECTED JSON SCHEMA:
    {
      "title": "Full Academic Title",
      "authors": ["Full Author Names"],
      "publisher": "Journal or Publisher Name",
      "year": "YYYY",
      "type": "Literature" | "Task" | "Personal" | "Other",
      "category": "e.g., Original Research, Review, case study",
      "topic": "Broad Scientific Topic",
      "subTopic": "Specific Research Area",
      "keywords": ["5-7 specific keywords"],
      "labels": ["thematic labels"],
      "inTextCitation": "Provide APA 7 parenthetical citation e.g. (Author, 2024)",
      "bibCitation": "Provide full Bibliographic Citation in APA 7 style",
      "researchMethodology": "Describe the methods used in the study",
      "abstract": "Concise abstract of the document",
      "summary": "2-3 sentences of main findings",
      "strength": "1. First strength\\n2. Second strength",
      "weakness": "1. First weakness\\n2. Second weakness",
      "unfamiliarTerminology": "1. Term: Definition\\n2. Term: Definition",
      "supportingReferences": "1. Ref 1\\n2. Ref 2",
      "videoRecommendation": "YouTube Video ID (e.g. dQw4w9WgXcQ) or relevant search query",
      "quickTipsForYou": "Narrative paragraph on how to use this knowledge in practice."
    }
    
    TEXT SNIPPET:
    ${textSnippet.substring(0, 12000)}`;

    const jsonResponse = await callAiProxy('groq', prompt);
    
    if (!jsonResponse) return {};
    
    const parsed = JSON.parse(jsonResponse);
    return parsed;
  } catch (error) {
    console.error('Deep Extraction Workflow Failed:', error);
    return {};
  }
};
