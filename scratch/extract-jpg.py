pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"
output_path = r"d:\ss\public\logo.png"

try:
    with open(pdf_path, "rb") as f:
        data = f.read()
        
    start_idx = data.find(b"\xff\xd8\xff")
    if start_idx == -1:
        print("No JPEG header found.")
        exit(1)
        
    # Find the end marker \xff\xd9 AFTER the start_idx
    # Standard JPEG ends with \xff\xd9. Let's find the last one or the next one
    end_idx = data.find(b"\xff\xd9", start_idx)
    if end_idx == -1:
        print("No JPEG end marker found.")
        exit(1)
        
    # Include the end marker bytes (2 bytes)
    end_idx += 2
    
    jpeg_data = data[start_idx:end_idx]
    
    with open(output_path, "wb") as f_out:
        f_out.write(jpeg_data)
        
    print(f"Successfully extracted JPEG of size {len(jpeg_data)} bytes and saved to {output_path}")
except Exception as e:
    print("Error:", e)
