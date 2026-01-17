
import io
import re
from pypdf import PdfReader
from flask import Flask, request, jsonify

app = Flask(__name__)

def clean_text(text):
    # Remove ligatures and strange spacing common in PDFs
    text = re.sub(r'([A-Z])\s(?=[a-z])', r'\1', text) 
    return " ".join(text.split())

def extract_metadata_heuristics(full_text, filename):
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    
    metadata = {
        "title": filename.replace(".pdf", "").replace("_", " "),
        "authors": [],
        "year": "",
        "publisher": "",
        "keywords": [],
        "category": "Original Research",
        "type": "Literature"
    }

    # Year Extraction
    year_match = re.search(r'\b(19|20)\d{2}\b', full_text[:5000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # Basic Publisher Heuristic
    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage"]
    for pub in publishers:
        if pub.lower() in full_text[:10000].lower():
            metadata["publisher"] = pub
            break

    return metadata

@app.route('/api/extract', methods=['POST'])
def extract():
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400

        file_bytes = file.read()
        f = io.BytesIO(file_bytes)
        
        try:
            reader = PdfReader(f)
            full_text = ""
            # Process enough pages to get meaningful content
            max_pages = min(len(reader.pages), 30)
            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    full_text += page_text + "\n"
        except Exception as pdf_err:
            return jsonify({"status": "error", "message": f"PDF Error: {str(pdf_err)}"}), 422

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Could not extract text."}), 422

        # Basic heuristics for fallback
        metadata = extract_metadata_heuristics(full_text, file.filename)
        
        # Prepare the 10k snippet for AI
        ai_snippet = full_text[:10000]
        
        # Split text for Spreadsheet storage (max 5 chunks @ 48k chars)
        chunks = [full_text[i:i+48000] for i in range(0, len(full_text), 48000)][:5]

        return jsonify({
            "status": "success",
            "data": {
                **metadata,
                "aiSnippet": ai_snippet,
                "chunks": chunks
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
