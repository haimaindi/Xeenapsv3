
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
            # Loop through all pages
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        except Exception as pdf_err:
            return jsonify({"status": "error", "message": f"PDF Error: {str(pdf_err)}"}), 422

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Could not extract text."}), 422

        # 1. Batasi total teks (200.000 karakter)
        limit_total = 200000
        limited_text = full_text[:limit_total]

        # 2. Heuristik metadata tetap menggunakan teks awal
        metadata = extract_metadata_heuristics(limited_text, file.filename)
        
        # 3. Snippet untuk AI (Groq/Gemini) dikurangi ke 2500 karakter sesuai permintaan
        ai_snippet = limited_text[:2500]
        
        # 4. Split teks ke dalam 10 chunks (masing-masing 20.000 karakter)
        chunk_size = 20000
        chunks = [limited_text[i:i+chunk_size] for i in range(0, len(limited_text), chunk_size)][:10]

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
