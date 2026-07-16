import fitz

pdf_path = r"public/logo.pdf"
output_pdf_path = r"public/logo_transparent.pdf"
output_png_path = r"public/logo_transparent.png"

try:
    doc = fitz.open(pdf_path)
    # Get content stream of page 0
    xref = doc[0].get_contents()[0]
    stream = doc.xref_stream(xref)
    
    # We want to remove:
    # /CS14 cs 0.6196 0.6196 0.6196 scn
    # 0.0000 595.2756 m
    # 595.2756 595.2756 l
    # 595.2756 0.0000 l
    # 0.0000 0.0000 l
    # h
    # f*
    target = (
        b"/CS14 cs 0.6196 0.6196 0.6196 scn\r\n"
        b"0.0000 595.2756 m\r\n"
        b"595.2756 595.2756 l\r\n"
        b"595.2756 0.0000 l\r\n"
        b"0.0000 0.0000 l\r\n"
        b"h\r\n"
        b"f*"
    )
    
    if target in stream:
        print("Found target in stream!")
        new_stream = stream.replace(target, b"")
        doc.update_stream(xref, new_stream)
        doc.save(output_pdf_path)
        print("Saved transparent PDF to:", output_pdf_path)
        
        # Now render the transparent PDF
        doc_trans = fitz.open(output_pdf_path)
        page = doc_trans[0]
        zoom = 4.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=True)
        pix.save(output_png_path)
        print(f"Rendered PNG to {output_png_path} with size {pix.width}x{pix.height}")
    else:
        print("Target not found in stream. Let's look for matching pattern with flexible spacing/newlines.")
        # Let's try matching with universal newlines
        stream_str = stream.decode('latin-1')
        import re
        pattern = r"/CS14\s+cs\s+0\.6196\s+0\.6196\s+0\.6196\s+scn\s+0\.0000\s+595\.2756\s+m\s+595\.2756\s+595\.2756\s+l\s+595\.2756\s+0\.0000\s+l\s+0\.0000\s+0\.0000\s+l\s+h\s+f\*"
        match = re.search(pattern, stream_str)
        if match:
            print("Found via regex!")
            start, end = match.span()
            new_stream = stream[:start] + stream[end:]
            doc.update_stream(xref, new_stream)
            doc.save(output_pdf_path)
            
            doc_trans = fitz.open(output_pdf_path)
            page = doc_trans[0]
            zoom = 4.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=True)
            pix.save(output_png_path)
            print("Successfully rendered via regex match.")
        else:
            print("Could not match background drawing pattern in stream.")
            
except Exception as e:
    print("Error:", e)
