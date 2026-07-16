import os
from pypdf import PdfReader

pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"
output_dir = r"d:\ss\public"

reader = PdfReader(pdf_path)
page = reader.pages[0]

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

image_saved = False
for count, image_file_object in enumerate(page.images):
    name = image_file_object.name
    # Determine extension
    ext = os.path.splitext(name)[1]
    if not ext:
        ext = ".png" # default to png
        
    output_path = os.path.join(output_dir, "logo" + ext)
    
    with open(output_path, "wb") as fp:
        fp.write(image_file_object.data)
        print(f"Extracted: {name} -> saved to: {output_path}")
        image_saved = True
        break

if not image_saved:
    print("No images found in the PDF page.")
