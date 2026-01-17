
/**
 * XEENAPS PKM - SECURE BACKEND V3 (AUTO-INIT)
 * Bridge for Frontend, Multi-Spreadsheets, Drive & Dynamic Gemini Key Rotation
 */

// --- CONFIGURATION ---
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1GCNKFrE7c89r7cyb9hPtpiHCqveo8JUF'
  },
  SPREADSHEETS: {
    LIBRARY: '1wPTMx6yrv2iv0lejpNdClmC162aD3iekzSWP5EPNm0I',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0' 
  },
  SCHEMAS: {
    LIBRARY: [
      'id', 'title', 'type', 'category', 'topic', 'subTopic', 'author', 'publisher', 'year', 
      'source', 'format', 'url', 'fileId', 'tags', 'createdAt', 'updatedAt',
      'extractedInfo1', 'extractedInfo2', 'extractedInfo3', 'extractedInfo4', 'extractedInfo5'
    ],
    KEYS: ['id', 'key', 'label', 'status', 'addedAt']
  }
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/**
 * Ensures required sheets and headers exist.
 */
function initializeDatabase() {
  initSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", CONFIG.SCHEMAS.LIBRARY);
  initSheet(CONFIG.SPREADSHEETS.KEYS, "ApiKeys", CONFIG.SCHEMAS.KEYS);
}

function initSheet(ssId, sheetName, headers) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    const isHeaderCorrect = headers.every((h, i) => currentHeaders[i] === h);
    if (!isHeaderCorrect || sheet.getLastRow() === 0) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
  } catch (e) {
    console.error(`Failed to init sheet ${sheetName}: ${e.message}`);
  }
}

function doGet(e) {
  initializeDatabase();
  const action = e.parameter.action;
  try {
    if (action === 'getLibrary') {
      return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections") });
    }
    return createJsonResponse({ status: 'error', message: 'Unknown GET action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  initializeDatabase();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  try {
    if (action === 'saveItem') {
      saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", data.item);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", data.id);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'uploadAndExtract') {
      return handleUploadAndExtract(data.fileData, data.fileName);
    }
    return createJsonResponse({ status: 'error', message: 'Unknown POST action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// --- CORE FUNCTIONS ---

function getAllItems(ssId, sheetName) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    let item = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (h === 'tags' || h === 'authors' || h === 'keywords' || h === 'labels') {
        try { val = JSON.parse(row[i] || '[]'); } catch(e) { val = row[i]; }
      }
      item[h] = val;
    });
    return item;
  });
}

function saveToSheet(ssId, sheetName, item) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(h => {
    const val = item[h];
    return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val || '');
  });
  sheet.appendRow(rowData);
}

function deleteFromSheet(ssId, sheetName, id) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// --- EXTRACTION ENGINE ---

function handleUploadAndExtract(base64Data, fileName) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
    const contentType = 'application/pdf';
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, fileName);
    
    // Save Original PDF to Drive
    const pdfFile = folder.createFile(blob);
    const pdfId = pdfFile.getId();
    
    // Step 1: Create OCR Job (Temporary Google Doc)
    const resource = {
      title: "TEMP_OCR_" + fileName,
      mimeType: contentType
    };
    
    // Use Drive API v2 for OCR
    const ocrFile = Drive.Files.insert(resource, blob, { ocr: true });
    const docId = ocrFile.id;
    
    // Step 2: Read Text from created Doc
    const doc = DocumentApp.openById(docId);
    const fullText = doc.getBody().getText();
    
    // Step 3: Extract Metadata using Regex (Heuristic)
    const metadata = extractMetadata(fullText);
    
    // Step 4: Chunking (Max 48000 per chunk)
    const chunks = chunkText(fullText, 48000);
    
    // Step 5: Clean up temporary Google Doc
    DriveApp.getFileById(docId).setTrashed(true);

    return createJsonResponse({
      status: 'success',
      data: {
        ...metadata,
        fullText: fullText.substring(0, 1000), 
        chunks: chunks,
        fileId: pdfId // Return the ID of the saved PDF
      }
    });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: 'OCR Error: ' + e.toString() });
  }
}

function extractMetadata(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const first3Pages = text.substring(0, 5000).toLowerCase();
  
  // Year Regex (1900-2099)
  const yearMatch = first3Pages.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : "";
  
  // Title Detection: Look for the first line that is long enough and not just numeric
  let title = "";
  let titleIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.length > 20 && !/^\d+$/.test(line)) {
      title = line;
      titleIndex = i;
      break;
    }
  }
  if (!title) title = lines[0] || "Untitled";

  // Author(s) Detection: Next line after title
  let authors = [];
  if (titleIndex !== -1 && lines[titleIndex + 1]) {
    const authorLine = lines[titleIndex + 1];
    if (authorLine.length < 150 && authorLine.includes(' ')) {
       authors = authorLine.split(/[,;]/).map(a => a.trim()).filter(a => a.length > 3);
    }
  }

  // Publisher detection
  const publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM"];
  let publisher = "";
  for (const p of publishers) {
    if (first3Pages.includes(p.toLowerCase())) {
      publisher = p;
      break;
    }
  }

  // Keywords detection
  let keywords = [];
  const keywordMatch = text.match(/(?:Keywords|Index Terms)[:\s]+([^.\n]+)/i);
  if (keywordMatch && keywordMatch[1]) {
    keywords = keywordMatch[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
  }

  // Type & Category Heuristics
  let type = "Literature"; 
  let category = "Original Research"; 
  
  if (first3Pages.includes("review") || first3Pages.includes("survey") || first3Pages.includes("comprehensive")) {
    category = "Review";
  }
  
  if (first3Pages.includes("task") || first3Pages.includes("assignment") || first3Pages.includes("homework")) {
    type = "Task";
  }

  return {
    title: title.substring(0, 200),
    year: year,
    publisher: publisher,
    authors: authors,
    keywords: keywords,
    type: type,
    category: category
  };
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
