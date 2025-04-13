def encode_image_to_base64(image_path):
    """Reads an image file and encodes it into base64."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image {image_path}: {e}")
        return None

def get_image_mime_type(image_path):
    """Determines the MIME type based on file extension."""
    ext = os.path.splitext(image_path)[1].lower()
    if ext == ".jpeg" or ext == ".jpg":
        return "image/jpeg"
    elif ext == ".png":
        return "image/png"
    elif ext == ".webp":
         return "image/webp"
    # Add other supported types if needed
    else:
        print(f"Warning: Unsupported image extension '{ext}' for {image_path}. Skipping MIME type.")
        return "application/octet-stream" # Default or raise error