
import io
import re
from pypdf import PdfReader
from pptx import Presentation
from docx import Document
import openpyxl
from flask import Flask, request, jsonify

app = Flask(__name__)

def clean_text(text):
    # Remove ligatures and strange spacing common in PDFs
    text = re.sub(r'([A-Z])\s(?=[a-z])', r'\1', text) 
    return " ".join(text.split())

def extract_metadata_heuristics(full_text, filename):
    metadata = {
        "title": filename.rsplit('.', 1)[0].replace("_", " "),
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

        filename_lower = file.filename.lower()
        
        # Audio/Video block
        audio_video_ext = ('.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv')
        if filename_lower.endswith(audio_video_ext):
            return jsonify({"status": "error", "message": "Audio and video files are not supported. Documents only."}), 400

        file_bytes = file.read()
        f = io.BytesIO(file_bytes)
        full_text = ""

        if filename_lower.endswith('.pdf'):
            try:
                reader = PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
            except Exception as e:
                return jsonify({"status": "error", "message": f"PDF Error: {str(e)}"}), 422
        elif filename_lower.endswith('.docx'):
            try:
                doc = Document(f)
                full_text = "\n".join([para.text for para in doc.paragraphs])
            except Exception as e:
                return jsonify({"status": "error", "message": f"Word Error: {str(e)}"}), 422
        elif filename_lower.endswith('.pptx'):
            try:
                prs = Presentation(f)
                for slide in prs.slides:
                    for shape in slide.shapes:
                        if hasattr(shape, "text") and shape.text:
                            full_text += shape.text + "\n"
                    if slide.has_notes_slide:
                        notes_text = slide.notes_slide.notes_text_frame.text
                        if notes_text:
                            full_text += notes_text + "\n"
            except Exception as e:
                return jsonify({"status": "error", "message": f"PPTX Error: {str(e)}"}), 422
        elif filename_lower.endswith('.xlsx'):
            try:
                wb = openpyxl.load_workbook(f, data_only=True)
                for sheet in wb.worksheets:
                    for row in sheet.iter_rows(values_only=True):
                        full_text += " ".join([str(cell) for cell in row if cell is not None]) + "\n"
            except Exception as e:
                return jsonify({"status": "error", "message": f"Excel Error: {str(e)}"}), 422
        elif filename_lower.endswith(('.txt', '.md', '.csv')):
            try:
                full_text = file_bytes.decode('utf-8', errors='ignore')
            except Exception as e:
                return jsonify({"status": "error", "message": f"Text File Error: {str(e)}"}), 422
        else:
            return jsonify({"status": "error", "message": "Unsupported file format. Please upload a document (PDF, Word, Excel, PPT, Text)."}), 400

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Could not extract text from the document."}), 422

        # 1. Batasi total teks (200.000 karakter)
        limit_total = 200000
        limited_text = full_text[:limit_total]

        # 2. Heuristik metadata tetap menggunakan teks awal
        metadata = extract_metadata_heuristics(limited_text, file.filename)
        
        # 3. Snippet untuk AI (Groq/Gemini) dikurangi ke 7500 karakter sesuai permintaan
        ai_snippet = limited_text[:7500]
        
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
        return jsonify({"status": "error", "message": str(e)}), 