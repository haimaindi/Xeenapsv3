
/**
 * XEENAPS PKM - SECURE BACKEND V5 (AI PROXY EDITION)
 */

const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1GCNKFrE7c89r7cyb9hPtpiHCqveo8JUF'
  },
  SPREADSHEETS: {
    LIBRARY: '1wPTMx6yrv2iv0lejpNdClmC162aD3iekzSWP5EPNm0I',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s'
  }
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getLibrary') return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections") });
  if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getAiConfig() });
  return createJsonResponse({ status: 'error', message: 'Invalid action' });
}

function doPost(e) {
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
    if (action === 'uploadOnly') {
      const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), 'application/pdf', data.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }
    
    // AI PROXY ACTION (Securely handle Groq & Gemini)
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride } = data;
      return createJsonResponse(handleAiRequest(provider, prompt, modelOverride));
    }

    return createJsonResponse({ status: 'error', message: 'Invalid action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Logika AI Proxy dengan Rotasi Key Otomatis
 */
function handleAiRequest(provider, prompt, modelOverride) {
  const keys = (provider === 'groq') ? getKeysFromSheet('Groq', 2) : getKeysFromSheet('ApiKeys', 1);
  const config = getAiConfig();
  const model = modelOverride || (provider === 'gemini' ? config.model : 'groq/compound');

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      let response;
      if (provider === 'groq') {
        response = callGroqApi(apiKey, model, prompt);
      } else {
        response = callGeminiApi(apiKey, model, prompt);
      }
      
      if (response) return { status: 'success', data: response };
    } catch (err) {
      console.warn(`Key #${i+1} for ${provider} failed: ${err.toString()}`);
      if (i === keys.length - 1) throw err; // Jika kunci terakhir, lempar error
    }
  }
  return { status: 'error', message: 'All keys failed or limited' };
}

function callGroqApi(apiKey, model, prompt) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are a senior data extractor. Return ONLY strict JSON." },
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
  if (res.getResponseCode() === 429) return null; // Rate limited, return null to rotate
  const json = JSON.parse(res.getContentText());
  return json.choices[0].message.content;
}

function callGeminiApi(apiKey, model, prompt) {
  // Gunakan endpoint REST Gemini
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
  if (res.getResponseCode() === 429) return null;
  const json = JSON.parse(res.getContentText());
  return json.candidates[0].content.parts[0].text;
}

function getKeysFromSheet(sheetName, colIndex) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, colIndex, lastRow - 1, 1).getValues()
      .map(r => r[0]).filter(k => k && k.toString().trim() !== "");
  } catch (e) { return []; }
}

function getAiConfig() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.AI_CONFIG);
    const sheet = ss.getSheetByName('AI');
    const val = sheet.getRange("B1").getValue();
    return { model: val ? val.trim() : 'gemini-3-flash-preview' };
  } catch (e) { return { model: 'gemini-3-flash-preview' }; }
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
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
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
