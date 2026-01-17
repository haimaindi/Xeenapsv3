
/**
 * XEENAPS PKM - SECURE BACKEND V10 (DYNAMIC AI CONFIG EDITION)
 */

const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1GCNKFrE7c89r7cyb9hPtpiHCqveo8JUF'
  },
  SPREADSHEETS: {
    LIBRARY: '1wPTMx6yrv2iv0lejpNdClmC162aD3iekzSWP5EPNm0I',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s'
  },
  SCHEMAS: {
    LIBRARY: [
      'id', 'title', 'type', 'category', 'topic', 'subTopic', 'author', 'publisher', 'year', 
      'source', 'format', 'url', 'fileId', 'tags', 'createdAt', 'updatedAt',
      'inTextCitation', 'bibCitation', 'researchMethodology', 'abstract', 'summary',
      'strength', 'weakness', 'unfamiliarTerminology', 'supportingReferences', 
      'videoRecommendation', 'quickTipsForYou',
      'extractedInfo1', 'extractedInfo2', 'extractedInfo3', 'extractedInfo4', 'extractedInfo5',
      'extractedInfo6', 'extractedInfo7', 'extractedInfo8', 'extractedInfo9', 'extractedInfo10'
    ]
  }
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getLibrary') return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections") });
  if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
  return createJsonResponse({ status: 'error', message: 'Invalid action' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(e) {
    return createJsonResponse({ status: 'error', message: 'Malformed JSON request' });
  }
  
  const action = body.action;
  
  try {
    if (action === 'saveItem') {
      saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.item);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.id);
      return createJsonResponse({ status: 'success' });
    }
    if (action === 'uploadOnly') {
      const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
      const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), 'application/pdf', body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }
    
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride } = body;
      const result = handleAiRequest(provider, prompt, modelOverride);
      return createJsonResponse(result);
    }

    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Mencari model spesifik untuk provider dari Spreadsheet AI_CONFIG sheet AI
 * Kolom A: Nama Provider (GEMINI, GROQ)
 * Kolom B: Nama Model
 */
function getProviderModel(providerName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.AI_CONFIG);
    const sheet = ss.getSheetByName('AI');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase() === providerName.toUpperCase()) {
        return { model: data[i][1] ? data[i][1].trim() : getDefaultModel(providerName) };
      }
    }
  } catch (e) { console.error("Config fetch error:", e); }
  return { model: getDefaultModel(providerName) };
}

function getDefaultModel(provider) {
  return provider.toUpperCase() === 'GEMINI' ? 'gemini-3-flash-preview' : 'meta-llama/llama-4-scout-17b-16e-instruct';
}

function handleAiRequest(provider, prompt, modelOverride) {
  const keys = (provider === 'groq') ? getKeysFromSheet('Groq', 2) : getKeysFromSheet('ApiKeys', 1);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No API keys found for ' + provider };
  
  // Mengambil model dari spreadsheet berdasarkan provider (GROQ atau GEMINI)
  const config = getProviderModel(provider);
  const model = modelOverride || config.model;

  let lastError = '';
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      let responseText;
      if (provider === 'groq') {
        responseText = callGroqApi(apiKey, model, prompt);
      } else {
        responseText = callGeminiApi(apiKey, model, prompt);
      }
      
      if (responseText) return { status: 'success', data: responseText };
    } catch (err) {
      lastError = err.toString();
    }
  }
  return { status: 'error', message: 'All API keys failed. Last error: ' + lastError };
}

function callGroqApi(apiKey, model, prompt) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are an expert academic research librarian. Always return valid raw JSON without conversational filler." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  const responseText = res.getContentText();
  let json;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error('Groq API returned non-JSON response');
  }
  
  if (res.getResponseCode() !== 200) {
    throw new Error(json.error ? json.error.message : 'Groq API Error ' + res.getResponseCode());
  }
  
  if (json && json.choices && json.choices[0] && json.choices[0].message) {
    return json.choices[0].message.content;
  }
  throw new Error('Groq response format invalid');
}

function callGeminiApi(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  const responseText = res.getContentText();
  let json;
  try {
    json = JSON.parse(responseText);
  } catch (e) {
    throw new Error('Gemini API returned non-JSON response');
  }
  
  if (res.getResponseCode() !== 200) {
    throw new Error(json.error ? json.error.message : 'Gemini API Error ' + res.getResponseCode());
  }
  
  if (json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
    return json.candidates[0].content.parts[0].text;
  }
  throw new Error('Gemini response format invalid');
}

function getKeysFromSheet(sheetName, colIndex) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, colIndex, lastRow - 1, 1).getValues()
      .map(r => r[0]).filter(k => k && k.toString().trim() !== "");
  } catch (e) { return []; }
}

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
      if (['tags', 'authors', 'keywords', 'labels'].includes(h)) {
        try { val = JSON.parse(row[i] || '[]'); } catch(e) { val = []; }
      }
      item[h] = val;
    });
    return item;
  });
}

function saveToSheet(ssId, sheetName, item) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  const headers = CONFIG.SCHEMAS.LIBRARY;
  const rowData = headers.map(h => {
    const val = item[h];
    return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val || '');
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

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
