from PIL import Image

pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"
output_path = r"d:\ss\public\logo.png" # Let's save as logo.png

try:
    with open(pdf_path, "rb") as f:
        data = f.read()
        
    start_idx = data.find(b"\xff\xd8\xff")
    if start_idx == -1:
        print("No JPEG header found.")
        exit(1)
        
    end_idx = data.find(b"\xff\xd9", start_idx)
    if end_idx == -1:
        print("No JPEG end marker found.")
        exit(1)
        
    end_idx += 2
    jpeg_data = data[start_idx:end_idx]
    
    with open(output_path, "wb") as f_out:
        f_out.write(jpeg_data)
        
    print(f"Extracted JPEG size: {len(jpeg_data)} bytes")
    
    # Open and verify using Pillow
    img = Image.open(output_path)
    print(f"Image format: {img.format}")
    print(f"Image size: {img.size}")
    
except Exception as e:
    print("Error:", e)
