
import io
import re
from pypdf import PdfReader
from flask import Flask, request, jsonify

app = Flask(__name__)

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

    # 1. Title Heuristic
    journal_noises = ["journal", "proceedings", "vol.", "no.", "issn", "http", "doi", "original", "article"]
    for i in range(min(15, len(lines))):
        line = lines[i]
        lower_line = line.lower()
        if len(line) > 20 and not any(noise in lower_line for noise in journal_noises):
            metadata["title"] = line
            break

    # 2. Year Heuristic
    year_match = re.search(r'\b(19|20)\d{2}\b', full_text[:10000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # 3. Publisher Heuristic
    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage"]
    for pub in publishers:
        if pub.lower() in full_text[:15000].lower():
            metadata["publisher"] = pub
            break

    # 4. Author Heuristic
    title_idx = -1
    for i, line in enumerate(lines):
        if line == metadata["title"]:
            title_idx = i
            break
    
    if title_idx != -1 and title_idx + 1 < len(lines):
        potential_authors = lines[title_idx + 1]
        if "," in potential_authors or " and " in potential_authors.lower():
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
            return jsonify({"status": "error", "message": "No file part in the request"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400

        # Read file into memory buffer
        file_bytes = file.read()
        f = io.BytesIO(file_bytes)
        
        # Load PDF
        try:
            reader = PdfReader(f)
            full_text = ""
            # Extract from first 30 pages to balance between data and performance
            max_pages = min(len(reader.pages), 30)
            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    full_text += page_text + "\n"
        except Exception as pdf_err:
            return jsonify({"status": "error", "message": f"PDF Parsing Error: {str(pdf_err)}"}), 422

        if not full_text.strip():
            return jsonify({"status": "error", "message": "PDF appears to be empty or an image-only scan."}), 422

        # Extract metadata
        metadata = extract_metadata_heuristics(full_text, file.filename)
        
        # Chunks for Google Sheets
        chunks = [full_text[i:i+48000] for i in range(0, len(full_text), 48000)][:5]

        return jsonify({
            "status": "success",
            "data": {
                **metadata,
                "chunks": chunks
            }
        })
    except Exception as e:
        # Global error catcher to help debugging
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
