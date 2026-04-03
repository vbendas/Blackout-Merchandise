#!/usr/bin/env python3
import json
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote
import re

# Load product data
with open('stanley_stella_products_complete.json', 'r') as f:
    products = json.load(f)

# Cloudinary CDN base URL
CLOUDINARY_BASE = "https://res.cloudinary.com/www-stanleystella-com/image/upload/"

# Extended color codes mapping
COLOR_CODES = {
    "Black": "C001", "White": "C002", "French Navy": "C003", "Natural Raw": "C004",
    "Heather Grey": "C005", "Burgundy": "C006", "Cotton Pink": "C007", "Misty Grey": "C008",
    "Faded Olive": "C009", "Grounded Beige": "C010", "Blue Grey": "C011", "Deep Plum": "C012",
    "Cream": "C013", "Summer Blue": "C014", "Serene Blue": "C057", "Sky Captain": "C058",
    "Khaki": "C059", "Beige": "C060", "Grey": "C061", "Red": "C062",
    "Green": "C063", "Brown": "C064", "Yellow": "C065", "Orange": "C066",
    "Purple": "C067", "Navy": "C003", "Gray": "C005", "Olive": "C009",
    "Off White": "C013", "Raw": "C004", "Natural": "C004", "Pink": "C007",
}

def get_actual_product_colors(sku):
    """Get actual available colors for a product"""
    for product in products:
        if product['sku'] == sku:
            colors = product.get('colors', [])
            available_colors = []
            for color in colors:
                if color in COLOR_CODES:
                    available_colors.append(color)
            return available_colors if available_colors else ["Black", "White"]
    return ["Black", "White"]

def generate_image_codes(sku, colors):
    """Generate image codes for available combinations"""
    image_codes = []
    
    # Most common image types that exist
    common_views = [
        ("PFM", "packshot", "Front Main"),
        ("PBM", "packshot", "Back Main"), 
        ("SFM", "studio", "Front Main"),
        ("SBM", "studio", "Back Main"),
    ]
    
    for color in colors:
        color_code = COLOR_CODES.get(color)
        if not color_code:
            continue
        
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
    """Construct Cloudinary URL"""
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
        return {"status": "error", "url": url, "file": file_path}

def main():
    print("Starting COMPLETE image download for Stanley Stella AW25 Collection...")
    print(f"Total products to process: {len(products)}")
    
    # Create main folder
    os.makedirs("Stanley Stella", exist_ok=True)
    
    # Generate all image download tasks for ALL products
    all_download_tasks = []
    
    for i, product in enumerate(products):
        if (i + 1) % 10 == 0:
            print(f"[{i+1}/{len(products)}] Processed {i+1} products...")
        
        colors = get_actual_product_colors(product['sku'])
        image_codes = generate_image_codes(product['sku'], colors)
        all_download_tasks.extend(image_codes)
    
    print(f"\nTotal images to download: {len(all_download_tasks)}")
    print("Starting download (max 15 concurrent downloads)...")
    
    # Download images in batches
    success_count = 0
    error_count = 0
    skipped_count = 0
    total_size = 0
    successful_downloads = []
    
    # Process in batches to avoid overwhelming
    batch_size = 500
    for batch_start in range(0, len(all_download_tasks), batch_size):
        batch_end = min(batch_start + batch_size, len(all_download_tasks))
        batch_tasks = all_download_tasks[batch_start:batch_end]
        
        print(f"\nProcessing batch {batch_start//batch_size + 1}/{(len(all_download_tasks)-1)//batch_size + 1} (images {batch_start+1}-{batch_end})")
        
        with ThreadPoolExecutor(max_workers=15) as executor:
            future_to_image = {
                executor.submit(download_image, img_info): img_info 
                for img_info in batch_tasks
            }
            
            for i, future in enumerate(as_completed(future_to_image), 1):
                result = future.result()
                
                if result["status"] == "success":
                    success_count += 1
                    total_size += result["size"]
                    successful_downloads.append(result)
                    if success_count % 10 == 0:
                        print(f"  ✓ Downloaded {success_count} images...")
                elif result["status"] == "exists":
                    skipped_count += 1
                else:
                    error_count += 1
        
        # Brief pause between batches
        if batch_end < len(all_download_tasks):
            time.sleep(2)
    
    # Print comprehensive summary
    print(f"\n" + "="*80)
    print(f"FINAL DOWNLOAD SUMMARY - STANLEY STELLA AW25 COLLECTION")
    print(f"="*80)
    print(f"Total Products: {len(products)}")
    print(f"Total Image Attempts: {len(all_download_tasks)}")
    print(f"Successfully Downloaded: {success_count} images")
    print(f"Already Existed: {skipped_count} images")
    print(f"Failed (404/Errors): {error_count} images")
    print(f"Total Size Downloaded: {total_size / (1024*1024):.2f} MB")
    print(f"Folder Structure: Stanley Stella/{ProductName}_{SKU}/{packshot|studio}/")
    
    # Success rate by product type
    print(f"\n" + "-"*50)
    print("SUCCESS RATE BY PRODUCT TYPE:")
    print("-"*50)
    
    sku_summary = {}
    for dl in successful_downloads:
        sku = dl['sku']
        if sku not in sku_summary:
            sku_summary[sku] = {'packshot': 0, 'studio': 0}
        sku_summary[sku][dl['type']] += 1
    
    # Count products with successful downloads
    products_with_downloads = len(sku_summary)
    print(f"Products with images: {products_with_downloads}/{len(products)} ({products_with_downloads/len(products)*100:.1f}%)")
    
    # Top successful products
    print(f"\nTop 10 Products by Image Count:")
    sorted_products = sorted(sku_summary.items(), key=lambda x: sum(x[1].values()), reverse=True)[:10]
    for sku, counts in sorted_products:
        product_name = next((p['name'] for p in products if p['sku'] == sku), sku)
        total_images = sum(counts.values())
        print(f"  {product_name} ({sku}): {total_images} images ({counts['packshot']} packshots, {counts['studio']} studio)")
    
    # Save comprehensive report
    report = {
        "summary": {
            "total_products": len(products),
            "products_with_downloads": products_with_downloads,
            "success_rate_percent": products_with_downloads/len(products)*100,
            "total_images_attempted": len(all_download_tasks),
            "success_count": success_count,
            "skipped_count": skipped_count,
            "error_count": error_count,
            "total_size_mb": total_size / (1024*1024)
        },
        "successful_downloads": successful_downloads,
        "folder_structure": "Stanley Stella/{ProductName}_{SKU}/{packshot|studio}/",
        "color_codes_used": list(set(COLOR_CODES.values())),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open('stanley_stella_final_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✓ Final report saved as: stanley_stella_final_report.json")
    print(f"✓ All images organized in 'Stanley Stella' folder")
    print(f"✓ Task completed successfully!")

if __name__ == "__main__":
    main()