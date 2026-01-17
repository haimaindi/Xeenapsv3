
import io
import json
import pdfplumber
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/extract', methods=['POST'])
def extract():
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400
        
        file = request.files['file']
        full_text = ""
        markdown_tables = []
        
        with pdfplumber.open(file) as pdf:
            # Metadata Extraction (First 3 pages for speed)
            for i, page in enumerate(pdf.pages[:50]): # Process up to 50 pages for Vercel limit
                full_text += page.extract_text() or ""
                
                # Table Extraction
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Convert to Markdown
                        md_table = "\n| " + " | ".join([str(cell or "") for cell in table[0]]) + " |\n"
                        md_table += "| " + " | ".join(["---" for _ in table[0]]) + " |\n"
                        for row in table[1:]:
                            md_table += "| " + " | ".join([str(cell or "") for cell in row]) + " |\n"
                        markdown_tables.append(md_table)

        # Chunking (Max 48000 for Spreadsheet cell limit)
        all_content = full_text + "\n\n### TABLES ###\n" + "\n".join(markdown_tables)
        chunks = [all_content[i:i+48000] for i in range(0, len(all_content), 48000)]

        return jsonify({
            "status": "success",
            "data": {
                "fullText": full_text[:2000],
                "chunks": chunks[:5], # Return up to 5 chunks for spreadsheet columns
                "tableCount": len(markdown_tables)
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run()
