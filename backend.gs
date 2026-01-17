
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
    LIBRARY: ['id', 'title', 'source', 'format', 'url', 'content', 'tags', 'summary', 'createdAt', 'updatedAt'],
    KEYS: ['id', 'key', 'label', 'status', 'addedAt']
  }
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/**
 * Ensures required sheets and headers exist.
 */
function initializeDatabase() {
  // Init Library Sheet
  initSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", CONFIG.SCHEMAS.LIBRARY);
  // Init Keys Sheet
  initSheet(CONFIG.SPREADSHEETS.KEYS, "ApiKeys", CONFIG.SCHEMAS.KEYS);
}

function initSheet(ssId, sheetName, headers) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Check headers
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    const isHeaderCorrect = headers.every((h, i) => currentHeaders[i] === h);
    
    if (!isHeaderCorrect || sheet.getLastRow() === 0) {
      sheet.clear(); // Clean up if messy
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
  } catch (e) {
    console.error(`Failed to init sheet ${sheetName} in SS ${ssId}: ${e.message}`);
  }
}

function doGet(e) {
  initializeDatabase(); // Run check on every access
  const action = e.parameter.action;
  try {
    if (action === 'getLibrary') {
      return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections") });
    }
    if (action === 'getKeys') {
      return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.KEYS, "ApiKeys") });
    }
    return createJsonResponse({ status: 'error', message: 'Unknown GET action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  initializeDatabase(); // Run check on every access
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

    if (action === 'saveKey') {
      saveToSheet(CONFIG.SPREADSHEETS.KEYS, "ApiKeys", data.keyRecord);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'deleteKey') {
      deleteFromSheet(CONFIG.SPREADSHEETS.KEYS, "ApiKeys", data.id);
      return createJsonResponse({ status: 'success' });
    }

    if (action === 'callGemini') {
      const aiResponse = fetchGeminiWithRotation(data.prompt);
      return createJsonResponse({ status: 'success', data: aiResponse });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown POST action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// --- REFACTORED CORE FUNCTIONS ---

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
      if (h === 'tags' || h === 'keyRecord') {
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

// --- AI ENGINE WITH KEY ROTATION ---

function fetchGeminiWithRotation(prompt) {
  const keyRecords = getAllItems(CONFIG.SPREADSHEETS.KEYS, "ApiKeys");
  const keys = keyRecords.filter(r => r.status === 'active').map(r => r.key);
  
  if (keys.length === 0) {
    throw new Error("No active API Keys found. Add them in Settings.");
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let lastError = "";
  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[i];
    try {
      const response = UrlFetchApp.fetch(`${GEMINI_ENDPOINT}?key=${activeKey}`, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      const result = JSON.parse(responseText);

      if (responseCode === 200 && result.candidates) {
        return result.candidates[0].content.parts[0].text;
      } 
      
      if (responseCode === 429) {
        console.warn(`Key ${i} limited. Rotating...`);
        lastError = "Rate limit hit on all keys.";
        continue;
      }
      lastError = `AI Error ${responseCode}: ${responseText}`;
    } catch (e) {
      lastError = e.toString();
    }
  }
  return "Failure: " + lastError;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
