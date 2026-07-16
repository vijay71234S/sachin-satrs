from PIL import Image

image_path = "public/logo_transparent.png"
output_path = "public/logo.png"

try:
    img = Image.open(image_path)
    # Find bounding box of non-transparent content
    bbox = img.getbbox()
    if not bbox:
        print("Error: Image is completely transparent!")
        exit(1)
        
    left, top, right, bottom = bbox
    w = right - left
    h = bottom - top
    print(f"Bounding box: {bbox} (width: {w}, height: {h})")
    
    # Crop to bounding box
    cropped = img.crop((left, top, right, bottom))
    
    # We want a square image.
    # We'll determine the size of the square based on max(w, h) plus some padding.
    max_dim = max(w, h)
    
    # Let's add 5% padding on all sides.
    # Total padding is 10% of max_dim.
    padding = int(max_dim * 0.05)
    square_size = max_dim + 2 * padding
    
    # Create new square transparent image
    square_img = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    
    # Calculate position to paste the cropped image to center it
    paste_x = padding + (max_dim - w) // 2
    paste_y = padding + (max_dim - h) // 2
    
    square_img.paste(cropped, (paste_x, paste_y))
    
    # Resize to 512x512
    final_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save as PNG
    final_img.save(output_path, "PNG")
    print(f"Successfully cropped, centered and resized logo to {output_path} (512x512)")
    
except Exception as e:
    print("Error:", e)
