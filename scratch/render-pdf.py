import fitz

pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"
output_path = r"d:\ss\public\logo.png"

try:
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    
    # 4x zoom for high definition
    zoom = 4.0
    mat = fitz.Matrix(zoom, zoom)
    
    # Render with alpha channel for transparency
    pix = page.get_pixmap(matrix=mat, alpha=True)
    pix.save(output_path)
    
    print(f"Successfully rendered PDF page to {output_path} (width: {pix.width}, height: {pix.height})")
except Exception as e:
    print("Error rendering PDF:", e)
