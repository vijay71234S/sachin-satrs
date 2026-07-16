import os
import sys
import shutil

src_pymupdf = r"C:\Users\bekan\AppData\Roaming\Python\Python314\site-packages\pymupdf"
src_fitz = r"C:\Users\bekan\AppData\Roaming\Python\Python314\site-packages\fitz"

dst_pymupdf = r"d:\ss\scratch\pymupdf"
dst_fitz = r"d:\ss\scratch\fitz"

try:
    if not os.path.exists(dst_pymupdf):
        shutil.copytree(src_pymupdf, dst_pymupdf)
        print("Copied pymupdf to scratch")
        
    if not os.path.exists(dst_fitz):
        shutil.copytree(src_fitz, dst_fitz)
        print("Copied fitz to scratch")

    sys.path.insert(0, r"d:\ss\scratch")
    
    import fitz
    print("SUCCESS: Fitz imported successfully from local scratch path!")
    
    pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(4.0, 4.0), alpha=True)
    pix.save(r"d:\ss\public\logo.png")
    print("SUCCESS: Logo rendered to public/logo.png!")
    
except Exception as e:
    print("Error:", e)
