#!/usr/bin/env python3
import json
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import itertools
from urllib.parse import quote

# Load product data
with open('stanley_stella_products_complete.json', 'r') as f:
    products = json.load(f)

# Cloudinary CDN base URL
CLOUDINARY_BASE = "https://res.cloudinary.com/www-stanleystella-com/image/upload/"

# Color codes mapping (common colors)
COLOR_CODES = {
    "Black": "C001",
    "White": "C002", 
    "French Navy": "C003",
    "Natural Raw": "C004",
    "Heather Grey": "C005",
    "Burgundy": "C006",
    "Cotton Pink": "C007",
    "Misty Grey": "C008",
    "Faded Olive": "C009",
    "Grounded Beige": "C010",
    "Blue Grey": "C011",
    "Deep Plum": "C012",
    "Cream": "C013",
    "Summer Blue": "C014",
    "Serene Blue": "C057",
    "Sky Captain": "C058",
    "Khaki": "C059",
    "Beige": "C060",
    "Grey": "C061",
    "Red": "C062",
    "Green": "C063",
    "Brown": "C064",
    "Yellow": "C065",
    "Orange": "C066",
    "Purple": "C067"
}

def generate_image_codes(sku, colors):
    """Generate all possible image codes for a product SKU and colors"""
    image_codes = []
    
    # Packshot types (P prefix)
    packshot_views = [
        ("PFM", "Front Main"),
        ("PBM", "Back Main"), 
        ("PSM", "Side Main"),
        ("PFD", "Front Detail"),
        ("PBD", "Back Detail"),
        ("PSD", "Side Detail")
    ]
    
    # Studio types (S prefix)  
    studio_views = [
        ("SFM", "Front Main"),
        ("SBM", "Back Main"),
        ("SSM", "Side Main"),
        ("SFD", "Front Detail"),
        ("SBD", "Back Detail"),
        ("SSD", "Side Detail")
    ]
    
    # Duo types (D prefix - multiple models/products)
    duo_views = [
        ("DFM", "Front Main"),
        ("DBM", "Back Main"),
        ("DSM", "Side Main")
    ]
    
    # Generate codes for each color
    for color in colors:
        color_code = COLOR_CODES.get(color, None)
        if not color_code:
            # Try to extract from color name if not in mapping
            # Many colors follow pattern C###, so let's try some common ones
            color_code = "C001"  # Default to Black if unknown
        
        # Packshots
        for view_code, view_name in packshot_views:
            image_codes.append({
                "code": f"{view_code}0_{sku}_{color_code}",
                "type": "packshot",
                "view": view_name,
                "color": color,
                "color_code": color_code
            })
        
        # Studio shots
        for view_code, view_name in studio_views:
            image_codes.append({
                "code": f"{view_code}0_{sku}_{color_code}",
                "type": "studio", 
                "view": view_name,
                "color": color,
                "color_code": color_code
            })
    
    return image_codes

def construct_image_url(image_code, resolution="low"):
    """Construct Cloudinary URL for an image code"""
    width = "1200" if resolution == "low" else "4000"
    return f"{CLOUDINARY_BASE}c_lpad,w_{width},f_auto,q_auto/v1/TechnicalNames/{image_code}.jpg"

def download_image(image_info, resolution="low"):
    """Download a single image"""
    url = construct_image_url(image_info["code"], resolution)
    filename = f"{image_info['code']}.jpg"
    
    # Determine folder structure
    product_name = next((p['name'] for p in products if p['sku'] == image_info['code'].split('_')[1]), "Unknown")
    sku = image_info['code'].split('_')[1]
    
    folder_path = f"Stanley Stella/{product_name}_{sku}/{image_info['type']}"
    os.makedirs(folder_path, exist_ok=True)
    
    file_path = os.path.join(folder_path, filename)
    
    # Skip if file already exists
    if os.path.exists(file_path):
        return {"status": "exists", "file": file_path, "url": url}
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        return {
            "status": "success", 
            "file": file_path, 
            "url": url,
            "size": len(response.content)
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": "error", 
            "error": str(e), 
            "url": url,
            "file": file_path
        }

def main():
    print("Starting direct image download for Stanley Stella AW25 Collection...")
    print(f"Total products to process: {len(products)}")
    
    # Create main folder
    os.makedirs("Stanley Stella", exist_ok=True)
    
    # Generate all image download tasks
    all_download_tasks = []
    total_images = 0
    
    for product in products:
        print(f"\nGenerating image codes for: {product['name']} ({product['sku']})")
        
        # Get colors from product data or use common colors
        colors = product.get('colors', ['Black', 'White'])  # Default to common colors if none specified
        
        # Generate image codes
        image_codes = generate_image_codes(product['sku'], colors)
        
        for img_info in image_codes:
            all_download_tasks.append(img_info)
        
        total_images += len(image_codes)
        print(f"  Generated {len(image_codes)} image codes")
    
    print(f"\nTotal images to download: {total_images}")
    print("Starting download (max 20 concurrent downloads)...")
    
    # Download images in batches
    success_count = 0
    error_count = 0
    skipped_count = 0
    total_size = 0
    
    # Use ThreadPoolExecutor for concurrent downloads
    with ThreadPoolExecutor(max_workers=20) as executor:
        # Submit all download tasks
        future_to_image = {
            executor.submit(download_image, img_info): img_info 
            for img_info in all_download_tasks[:100]  # Limit to first 100 for testing
        }
        
        # Process as they complete
        for i, future in enumerate(as_completed(future_to_image), 1):
            result = future.result()
            
            if result["status"] == "success":
                success_count += 1
                total_size += result["size"]
                print(f"[{i}/{min(100, len(all_download_tasks))}] ✓ {os.path.basename(result['file'])}")
            elif result["status"] == "exists":
                skipped_count += 1
                print(f"[{i}/{min(100, len(all_download_tasks))}] - {os.path.basename(result['file'])} (already exists)")
            else:
                error_count += 1
                print(f"[{i}/{min(100, len(all_download_tasks))}] ✗ {result['error']}")
            
            # Small delay between batches
            if i % 10 == 0:
                time.sleep(0.5)
    
    print(f"\n✓ Download completed!")
    print(f"✓ Successfully downloaded: {success_count} images")
    print(f"- Skipped existing: {skipped_count} images") 
    print(f"✗ Failed downloads: {error_count} images")
    print(f"✓ Total size: {total_size / (1024*1024):.2f} MB")
    print(f"✓ All images saved in 'Stanley Stella' folder")
    
    # Create a summary report
    report = {
        "total_products": len(products),
        "total_images_generated": total_images,
        "images_attempted": min(100, len(all_download_tasks)),
        "success_count": success_count,
        "error_count": error_count,
        "skipped_count": skipped_count,
        "total_size_mb": total_size / (1024*1024),
        "folder_structure": "Stanley Stella/{ProductName}_{SKU}/{packshot|studio}/"
    }
    
    with open('stanley_stella_download_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✓ Report saved as: stanley_stella_download_report.json")

if __name__ == "__main__":
    main()