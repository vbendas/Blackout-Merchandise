#!/usr/bin/env python3
import json
import re
from pathlib import Path

def extract_products_from_html(html_content, page_num):
    """Extract products from a single HTML page"""
    products = []
    
    # Check for AW25 indicators in the entire page
    aw25_patterns = [
        r'AW25',
        r'Autumn.*Winter.*2025',
        r'Fall.*Winter.*2025',
        r'New.*Collection.*AW25',
        r'Season.*AW25'
    ]
    
    is_aw25_page = any(re.search(pattern, html_content, re.IGNORECASE) for pattern in aw25_patterns)
    
    # Find all SKUs with their surrounding context
    sku_matches = re.finditer(r'<div class="product-card item product product-item "[^>]*data-sku="(ST[^"]+)"', html_content)
    
    for match in sku_matches:
        start_pos = match.start()
        sku = match.group(1)
        
        # Extract the full product block (from this div to the closing </li>)
        block_start = start_pos
        # Find the next </li> after this position
        block_end = html_content.find('</li>', start_pos)
        if block_end == -1:
            continue
        block = html_content[block_start:block_end + 5]
        
        # Extract URL
        url_match = re.search(r'href="([^"]+)"', block)
        url = url_match.group(1) if url_match else ''
        
        # Extract alt text
        alt_match = re.search(r'alt="([^"]+)"', block)
        alt_text = alt_match.group(1) if alt_match else ''
        
        # Extract title
        title_match = re.search(r'title="([^"]+)"', block)
        title_text = title_match.group(1) if title_match else ''
        
        # Parse product details
        # Use the longer of alt or title
        text_to_parse = title_text if len(title_text) > len(alt_text) else alt_text
        
        # Clean up HTML entities
        text_to_parse = text_to_parse.replace('&#x20;', ' ')
        
        # Extract product info
        parts = text_to_parse.split(' - ')
        
        product_name = parts[0] if len(parts) > 0 else ''
        color = parts[1] if len(parts) > 1 else ''
        
        # Determine product type and gender
        product_type = 'UNKNOWN'
        gender = 'UNISEX'
        
        if len(parts) > 2:
            type_gender_part = parts[2].upper()
            
            # Product type detection
            if 'TEE-SHIRTS' in type_gender_part:
                product_type = 'T-SHIRT'
            elif 'POLOS' in type_gender_part:
                product_type = 'POLO'
            elif 'OXFORD SHIRTS' in type_gender_part:
                product_type = 'OXFORD SHIRT'
            elif 'DENIM SHIRTS' in type_gender_part:
                product_type = 'DENIM SHIRT'
            elif 'SHIRTS' in type_gender_part and 'DENIM' not in type_gender_part:
                product_type = 'SHIRT'
            elif 'SWEATSHIRTS' in type_gender_part:
                product_type = 'SWEATSHIRT'
            elif 'HOODIES' in type_gender_part:
                product_type = 'HOODIE'
            elif 'JACKETS' in type_gender_part:
                product_type = 'JACKET' if 'DENIM' not in type_gender_part else 'DENIM JACKET'
            elif 'TROUSERS' in type_gender_part:
                product_type = 'TROUSERS'
            elif 'JEANS' in type_gender_part:
                product_type = 'JEANS'
            elif 'SHORTS' in type_gender_part:
                product_type = 'SHORTS'
            elif 'BODYSUITS' in type_gender_part:
                product_type = 'BODYSUIT'
            elif 'DRESSES' in type_gender_part:
                product_type = 'DRESS'
            elif 'SKIRTS' in type_gender_part:
                product_type = 'SKIRT'
            elif 'BUM BAGS' in type_gender_part:
                product_type = 'BUM BAG'
            elif 'CAPS' in type_gender_part:
                product_type = 'CAP'
            elif 'TOTES' in type_gender_part:
                product_type = 'TOTE BAG'
            elif 'BACKPACKS' in type_gender_part:
                product_type = 'BACKPACK'
            elif 'BEANIES' in type_gender_part:
                product_type = 'BEANIE'
        
        # Gender detection
        if len(parts) > 3:
            gender_part = parts[3].upper()
            if 'MEN' in gender_part:
                gender = 'MEN'
            elif 'WOMEN' in gender_part:
                gender = 'WOMEN'
            elif 'UNISEX' in gender_part:
                gender = 'UNISEX'
            elif 'KIDS' in gender_part:
                gender = 'KIDS'
        
        # Extract image URL
        img_match = re.search(r'src="([^"]+)"', block)
        img_url = img_match.group(1) if img_match else ''
        
        product = {
            'name': product_name.strip(),
            'sku': sku,
            'url': url,
            'product_type': product_type,
            'color': color.strip(),
            'gender': gender,
            'sizes': [],  # Not visible in listing
            'weight': None,  # Not visible in listing
            'fit': None,  # Not visible in listing
            'image_url': img_url,
            'is_aw25': is_aw25_page,
            'page': page_num
        }
        
        products.append(product)
    
    return products

# Process all files
files = [
    ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db', 1),
    ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11', 2),
    ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12', 3),
    ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc', 4)
]

all_products = []

for file_path, page_num in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    products = extract_products_from_html(html_content, page_num)
    all_products.extend(products)
    print(f"Page {page_num}: Extracted {len(products)} products")

# Summary statistics
print(f"\nTotal products extracted: {len(all_products)}")

# Product type distribution
type_counts = {}
for p in all_products:
    pt = p['product_type']
    type_counts[pt] = type_counts.get(pt, 0) + 1

print("\nProduct Types:")
for pt, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {pt}: {count}")

# AW25 products
aw25_products = [p for p in all_products if p['is_aw25']]
print(f"\nAW25 Collection Products: {len(aw25_products)}")

# Gender distribution
gender_counts = {}
for p in all_products:
    g = p['gender']
    gender_counts[g] = gender_counts.get(g, 0) + 1

print("\nGender Distribution:")
for g, count in sorted(gender_counts.items()):
    print(f"  {g}: {count}")

# Save complete JSON
output_file = Path(__file__).resolve().parent / 'stanley_stella_all_150_products.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_products, f, indent=2, ensure_ascii=False)

print(f"\nSaved to: {output_file}")

# Show sample
print("\nSample products:")
for p in all_products[:5]:
    print(f"\n  SKU: {p['sku']}")
    print(f"  Name: {p['name']}")
    print(f"  Type: {p['product_type']}")
    print(f"  Color: {p['color']}")
    print(f"  Gender: {p['gender']}")
    print(f"  AW25: {p['is_aw25']}")
