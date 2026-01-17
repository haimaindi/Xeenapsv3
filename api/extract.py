
import io
import re
import pdfplumber
from flask import Flask, request, jsonify

app = Flask(__name__)

def clean_text(text):
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

    # 1. Title Heuristic: Usually one of the first 10 lines, long, and not a journal name
    journal_noises = ["journal", "proceedings", "vol.", "no.", "issn", "http", "doi", "original", "article"]
    for i in range(min(15, len(lines))):
        line = lines[i]
        lower_line = line.lower()
        if len(line) > 20 and not any(noise in lower_line for noise in journal_noises):
            metadata["title"] = line
            break

    # 2. Year Heuristic: Look for 4 digits starting with 19 or 20 in the first 5000 chars
    year_match = re.search(r'\b(19|20)\d{2}\b', full_text[:5000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # 3. Publisher Heuristic: Common academic publishers
    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage"]
    for pub in publishers:
        if pub.lower() in full_text[:10000].lower():
            metadata["publisher"] = pub
            break

    # 4. Author Heuristic: Lines following the title often contain commas or 'and'
    # This is a simple guess based on name patterns
    title_idx = -1
    for i, line in enumerate(lines):
        if line == metadata["title"]:
            title_idx = i
            break
    
    if title_idx != -1 and title_idx + 1 < len(lines):
        potential_authors = lines[title_idx + 1]
        if "," in potential_authors or " and " in potential_authors.lower():
            # Clean common titles
            cleaned = re.sub(r'(PhD|MSc|MD|Prof\.|Dr\.)', '', potential_authors)
            metadata["authors"] = [a.strip() for a in re.split(r',| and ', cleaned) if len(a.strip()) > 2][:5]

    # 5. Keywords Heuristic
    kw_match = re.search(r'(?:Keywords|Index Terms)[:\s]+([^.\n]+)', full_text, re.IGNORECASE)
    if kw_match:
        metadata["keywords"] = [k.strip() for k in re.split(r',|;', kw_match.group(1)) if k.strip()][:5]

    return metadata

@app.route('/api/extract', methods=['POST'])
def extract():
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400
        
        file = request.files['file']
        filename = file.filename
        full_text = ""
        
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                if len(full_text) > 300000: # Limit for safety
                    break

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Could not read text from PDF."}), 422

        # Extract metadata using Python logic (No Gemini)
        metadata = extract_metadata_heuristics(full_text, filename)
        
        # Prepare chunks (Max 48000 per cell for Google Sheets)
        chunks = [full_text[i:i+48000] for i in range(0, len(full_text), 48000)][:5]

        return jsonify({
            "status": "success",
            "data": {
                **metadata,
                "chunks": chunks
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run()
