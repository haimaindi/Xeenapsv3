
import io
import re
from pypdf import PdfReader
from flask import Flask, request, jsonify

app = Flask(__name__)

def clean_text(text):
    return " ".join(text.split())

def extract_metadata_heuristics(full_text, filename):
    # Bersihkan teks awal untuk diproses per baris
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

    # --- 1. SMART TITLE EXTRACTION (Multi-line) ---
    # Kita cari baris yang terlihat seperti judul di 15 baris pertama
    journal_noises = ["journal", "proceedings", "vol.", "no.", "issn", "http", "doi", "original", "article", "pp.", "page"]
    stop_words = ["abstract", "keywords", "introduction", "background", "by ", "correspondence", "@"]
    
    title_lines = []
    found_start = False
    
    for i in range(min(20, len(lines))):
        line = lines[i]
        line_lower = line.lower()
        
        # Abaikan baris yang jelas-jelas info jurnal (Header)
        if any(noise in line_lower for noise in journal_noises) and not found_start:
            continue
            
        # Jika ketemu kata penghenti, berhenti mencari judul
        if any(stop in line_lower for stop in stop_words) and len(title_lines) > 0:
            break
            
        # Kriteria baris judul: cukup panjang atau huruf kapital yang dominan
        if len(line) > 15:
            if not found_start:
                found_start = True
            title_lines.append(line)
        elif found_start and len(title_lines) < 4:
            # Jika sudah mulai ketemu judul, baris pendek setelahnya mungkin sambungan
            title_lines.append(line)
        
        if len(title_lines) >= 4: # Judul jarang lebih dari 4 baris
            break

    if title_lines:
        full_title = " ".join(title_lines)
        # Bersihkan spasi ganda (kasus "T owards")
        full_title = re.sub(r'\s+', ' ', full_title).strip()
        metadata["title"] = full_title

    # --- 2. YEAR EXTRACTION ---
    year_match = re.search(r'\b(19|20)\d{2}\b', full_text[:10000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # --- 3. PUBLISHER / JOURNAL EXTRACTION ---
    # Cari pola "Journal of..." atau penerbit besar
    journal_pattern = re.search(r'([A-Z][\w\s]+Journal of [\w\s]+|[A-Z][\w\s]+International Journal of [\w\s]+)', full_text[:5000])
    if journal_pattern:
        metadata["publisher"] = journal_pattern.group(0).strip()
    else:
        publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage", "Oxford", "Cambridge"]
        for pub in publishers:
            if pub.lower() in full_text[:15000].lower():
                metadata["publisher"] = pub
                break

    # --- 4. AUTHOR EXTRACTION (Smarter) ---
    # Biasanya penulis ada di bawah judul. Kita cari baris setelah judul yang mengandung nama.
    potential_author_block = []
    if title_lines:
        last_title_line = title_lines[-1]
        start_idx = -1
        for i, line in enumerate(lines):
            if last_title_line in line:
                start_idx = i + 1
                break
        
        if start_idx != -1:
            # Ambil 5 baris setelah judul
            for j in range(start_idx, min(start_idx + 6, len(lines))):
                line = lines[j]
                # Filter noise (Afiliasi atau email)
                if any(x in line.lower() for x in ["university", "department", "hospital", "institute", "@", "faculty"]):
                    continue
                # Nama biasanya punya format: Kata Kapital, Kata Kapital
                if re.search(r'([A-Z][a-z]+[\s,]+[A-Z])', line):
                    potential_author_block.append(line)
            
            if potential_author_block:
                # Gabungkan dan split berdasarkan koma atau 'and'
                authors_str = " ".join(potential_author_block)
                # Bersihkan gelar akademik
                authors_str = re.sub(r'(PhD|MSc|MD|Prof\.|Dr\.|Associate|Professor|Lecturer)', '', authors_str)
                # Split
                raw_authors = re.split(r',| and |;', authors_str)
                metadata["authors"] = [a.strip() for a in raw_authors if len(a.strip()) > 3 and len(a.strip()) < 40][:5]

    # --- 5. KEYWORDS ---
    kw_match = re.search(r'(?:Keywords|Index Terms)[:\s]+([^.\n]+)', full_text, re.IGNORECASE)
    if kw_match:
        metadata["keywords"] = [k.strip() for k in re.split(r',|;', kw_match.group(1)) if k.strip()][:5]

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
            # Gunakan 20 halaman pertama untuk ekstraksi metadata & teks
            max_pages = min(len(reader.pages), 20)
            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    full_text += page_text + "\n"
        except Exception as pdf_err:
            return jsonify({"status": "error", "message": f"PDF Error: {str(pdf_err)}"}), 422

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Could not extract text."}), 422

        metadata = extract_metadata_heuristics(full_text, file.filename)
        
        # Split text for Spreadsheet (max 5 chunks @ 48000 chars)
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
    app.run(port=5000)
