pdf_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\media__1784183880814.pdf"

with open(pdf_path, "rb") as f:
    data = f.read()

print("Scanning for JPEG starts...")
idx = 0
while True:
    idx = data.find(b"\xff\xd8\xff", idx)
    if idx == -1:
        break
    end = data.find(b"\xff\xd9", idx)
    if end != -1:
        size = end + 2 - idx
        print(f"JPEG found at index {idx}, size {size} bytes")
    else:
        print(f"JPEG found at index {idx}, no end marker found")
    idx += 3

print("\nScanning for PNG starts...")
idx = 0
while True:
    idx = data.find(b"\x89PNG\r\n\x1a\n", idx)
    if idx == -1:
        break
    end = data.find(b"IEND", idx)
    if end != -1:
        size = end + 8 - idx # include IEND marker and CRC
        print(f"PNG found at index {idx}, size {size} bytes")
    else:
        print(f"PNG found at index {idx}, no IEND marker found")
    idx += 8
