pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"

try:
    with open(pdf_path, "rb") as f:
        data = f.read()
        
    print("Total PDF size:", len(data))
    
    # Search for JPEG header
    jpg_start = data.find(b"\xff\xd8\xff")
    if jpg_start != -1:
        print("Found JPEG header at byte:", jpg_start)
        
    # Search for PNG header
    png_start = data.find(b"\x89PNG\r\n\x1a\n")
    if png_start != -1:
        print("Found PNG header at byte:", png_start)
        
    # Search for standard PDF filter tags
    for tag in [b"/DCTDecode", b"/FlateDecode", b"/JPXDecode", b"/LZWDecode"]:
        count = data.count(tag)
        print(f"Occurrence of {tag.decode()}: {count}")
        
except Exception as e:
    print("Error:", e)
