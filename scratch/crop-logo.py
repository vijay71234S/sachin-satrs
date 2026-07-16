import os
from PIL import Image

screenshot_path = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306\final_zoomed_pdf_view_1784185617614.png"
output_path = r"d:\ss\public\logo.png"

try:
    if not os.path.exists(screenshot_path):
        # Let's find any PNG file in the artifacts directory that starts with final_zoomed
        artifacts_dir = r"C:\Users\bekan\.gemini\antigravity-ide\brain\20b76e41-c26b-421b-b576-9b30523a8306"
        files = [f for f in os.listdir(artifacts_dir) if f.startswith("final_zoomed") and f.endswith(".png")]
        if files:
            screenshot_path = os.path.join(artifacts_dir, files[0])
            print("Found screenshot file:", screenshot_path)
        else:
            raise FileNotFoundError("Screenshot not found in artifacts folder")

    img = Image.open(screenshot_path)
    W, H = img.size
    print(f"Original Screenshot Size: {W}x{H}")
    
    # We want to crop the square logo from the center.
    # The logo is centered. Let's crop a square of size H (the height of the viewport)
    # or H - 60 to avoid chrome PDF viewer toolbar if it exists.
    # Let's check height. If H is 776, a crop size of 680 is perfect!
    crop_size = min(W, H) - 80
    if crop_size <= 0:
        crop_size = min(W, H)
        
    left = (W - crop_size) // 2
    top = (H - crop_size) // 2
    right = left + crop_size
    bottom = top + crop_size
    
    cropped_img = img.crop((left, top, right, bottom))
    # Resize to a standard 512x512 for web logo
    final_img = cropped_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    final_img.save(output_path, "PNG")
    print(f"Successfully cropped logo to {output_path} (512x512)")
    
except Exception as e:
    print("Error cropping logo:", e)
