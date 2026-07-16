from pypdf import PdfReader

pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"

try:
    reader = PdfReader(pdf_path)
    print("Total indirect objects:", len(reader.objects))
    
    found_count = 0
    for idx in range(len(reader.objects)):
        try:
            obj = reader.objects[idx]
            if obj is None:
                continue
            if hasattr(obj, "get") and obj.get("/Subtype") == "/Image":
                found_count += 1
                print(f"\n[Image {found_count}] Index: {idx}")
                print("Width:", obj.get("/Width"))
                print("Height:", obj.get("/Height"))
                print("Filter:", obj.get("/Filter"))
                data = obj.data
                print("Decoded Data size:", len(data))
                
                # Determine extension based on filter
                ext = ".png"
                filt = obj.get("/Filter")
                if filt == "/DCTDecode" or (isinstance(filt, list) and "/DCTDecode" in filt):
                    ext = ".jpg"
                
                out_path = f"d:\\ss\\public\\logo_extracted_{found_count}{ext}"
                with open(out_path, "wb") as fp:
                    fp.write(data)
                print("Saved image to:", out_path)
                
        except Exception as e:
            pass
            
    print(f"\nScan complete. Found {found_count} images.")
except Exception as e:
    print("Error scanning PDF:", e)
