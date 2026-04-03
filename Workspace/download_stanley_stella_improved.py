#!/usr/bin/env python3
import json
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import itertools
from urllib.parse import quote
import re

# Load product data
with open('stanley_stella_products_complete.json', 'r') as f:
    products = json.load(f)

# Cloudinary CDN base URL
CLOUDINARY_BASE = "https://res.cloudinary.com/www-stanleystella-com/image/upload/"

# Extended color codes mapping - more comprehensive
COLOR_CODES = {
    # Basic colors
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
    "Khaki": "C059",
    "Beige": "C060",
    "Grey": "C061",
    "Red": "C062",
    "Green": "C063",
    "Brown": "C064",
    "Yellow": "C065",
    "Orange": "C066",
    "Purple": "C067",
    
    # Additional colors from Stanley Stella palette
    "Serene Blue": "C057",
    "Sky Captain": "C058",
    "Antique White": "C015",
    "Stellar Grey": "C016", 
    "Dusty Pink": "C017",
    "Cognac": "C018",
    "Forest Green": "C019",
    "Midnight Blue": "C020",
    "Rust": "C021",
    "Terracotta": "C022",
    "Moss": "C023",
    "Ochre": "C024",
    "Lavender": "C025",
    "Mauve": "C026",
    "Steel Blue": "C027",
    "Teal": "C028",
    "Indigo": "C029",
    "Wine": "C030",
    "Magenta": "C031",
    "Coral": "C032",
    "Peach": "C033",
    "Gold": "C034",
    "Silver": "C035",
    "Bronze": "C036",
    "Navy": "C003",  # Same as French Navy
    "Navy Blue": "C003",
    "Gray": "C005",  # Same as Heather Grey
    "Dark Grey": "C005",
    "Light Grey": "C008",
    "Olive": "C009",  # Same as Faded Olive
    "Beige": "C010",  # Same as Grounded Beige
    "Blue": "C011",   # Same as Blue Grey
    "Plum": "C012",   # Same as Deep Plum
    "Off White": "C013",
    "Off-White": "C013",
    "Raw": "C004",    # Same as Natural Raw
    "Natural": "C004",
    "Pink": "C007",    # Same as Cotton Pink
    "Burgandy": "C006", # Common typo
    "Burgandy Red": "C006",
}

def get_actual_product_colors(sku):
    """Get actual available colors for a product by checking its page"""
    try:
        # Use the product's actual colors from our data
        for product in products:
            if product['sku'] == sku:
                colors = product.get('colors', [])
                # Filter to only available colors in our mapping
                available_colors = []
                for color in colors:
                    if color in COLOR_CODES:
                        available_colors.append(color)
                return available_colors if available_colors else ["Black", "White"]  # Fallback
        return ["Black", "White"]
    except:
        return ["Black", "White"]

def generate_realistic_image_codes(sku, colors):
    """Generate realistic image codes for available combinations only"""
    image_codes = []
    
    # Only try the most common image types that actually exist
    common_views = [
        ("PFM", "packshot", "Front Main"),
        ("PBM", "packshot", "Back Main"), 
        ("SFM", "studio", "Front Main"),
        ("SBM", "studio", "Back Main"),
    ]
    
    # Generate codes for each color
    for color in colors:
        color_code = COLOR_CODES.get(color)
        if not color_code:
            continue  # Skip unknown colors
        
        for view_code, img_type, view_name in common_views:
            image_codes.append({
                "code": f"{view_code}0_{sku}_{color_code}",
                "type": img_type,
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
    """Download a single image with retry logic"""
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
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        return {
            "status": "success", 
            "file": file_path, 
            "url": url,
            "size": len(response.content),
            "sku": image_info['code'].split('_')[1],
            "type": image_info['type'],
            "color": image_info['color']
        }
    except requests.exceptions.RequestException:
        # Silently fail for 404s (most common case)
        return {"status": "error", "url": url, "file": file_path}

def main():
    print("Starting realistic image download for Stanley Stella AW25 Collection...")
    print(f"Total products to process: {len(products)}")
    
    # Create main folder
    os.makedirs("Stanley Stella", exist_ok=True)
    
    # Generate all image download tasks for first 20 products (for testing)
    all_download_tasks = []
    
    for i, product in enumerate(products[:20]):  # Limit to first 20 for now
        print(f"\n[{i+1}/20] Processing: {product['name']} ({product['sku']})")
        
        # Get actual colors for this product
        colors = get_actual_product_colors(product['sku'])
        print(f"  Available colors: {colors}")
        
        # Generate realistic image codes
        image_codes = generate_realistic_image_codes(product['sku'], colors)
        
        for img_info in image_codes:
            all_download_tasks.append(img_info)
        
        print(f"  Generated {len(image_codes)} image codes")
    
    print(f"\nTotal images to download: {len(all_download_tasks)}")
    print("Starting download (max 10 concurrent downloads)...")
    
    # Download images in batches
    success_count = 0
    error_count = 0
    skipped_count = 0
    total_size = 0
    successful_downloads = []
    
    # Use ThreadPoolExecutor for concurrent downloads
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all download tasks
        future_to_image = {
            executor.submit(download_image, img_info): img_info 
            for img_info in all_download_tasks
        }
        
        # Process as they complete
        for i, future in enumerate(as_completed(future_to_image), 1):
            result = future.result()
            
            if result["status"] == "success":
                success_count += 1
                total_size += result["size"]
                successful_downloads.append(result)
                print(f"[{i}/{len(all_download_tasks)}] ✓ {os.path.basename(result['file'])} ({result['type']}/{result['color']})")
            elif result["status"] == "exists":
                skipped_count += 1
                print(f"[{i}/{len(all_download_tasks)}] - {os.path.basename(result['file'])} (already exists)")
            else:
                error_count += 1
                # Don't print errors for 404s (expected behavior)
            
            # Small delay between batches
            if i % 20 == 0:
                time.sleep(0.5)
    
    # Print summary by SKU
    print(f"\n=== Download Summary by Product ===")
    sku_summary = {}
    for dl in successful_downloads:
        sku = dl['sku']
        if sku not in sku_summary:
            sku_summary[sku] = {'packshot': 0, 'studio': 0}
        sku_summary[sku][dl['type']] += 1
    
    for sku, counts in sku_summary.items():
        product_name = next((p['name'] for p in products if p['sku'] == sku), sku)
        print(f"{product_name} ({sku}): {counts['packshot']} packshots, {counts['studio']} studio")
    
    print(f"\n✓ Download completed!")
    print(f"✓ Successfully downloaded: {success_count} images")
    print(f"- Skipped existing: {skipped_count} images") 
    print(f"✗ Failed downloads: {error_count} images")
    print(f"✓ Total size: {total_size / (1024*1024):.2f} MB")
    print(f"✓ All images saved in 'Stanley Stella' folder")
    
    # Create a detailed report
    report = {
        "total_products_attempted": min(20, len(products)),
        "total_images_attempted": len(all_download_tasks),
        "success_count": success_count,
        "error_count": error_count,
        "skipped_count": skipped_count,
        "total_size_mb": total_size / (1024*1024),
        "successful_downloads": successful_downloads,
        "folder_structure": "Stanley Stella/{ProductName}_{SKU}/{packshot|studio}/",
        "note": "Limited to first 20 products for testing"
    }
    
    with open('stanley_stella_download_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✓ Detailed report saved as: stanley_stella_download_report.json")

if __name__ == "__main__":
    main()