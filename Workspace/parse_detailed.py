#!/usr/bin/env python3
import json
import re
from pathlib import Path

# Comprehensive product data extraction
def extract_detailed_products():
    """Extract detailed product information from all HTML files"""
    all_products = []
    
    files = [
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db', 1),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11', 2),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12', 3),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc', 4)
    ]
    
    for file_path, page_num in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for AW25 indicators
        aw25_indicators = [
            r'AW25',
            r'Autumn.*Winter.*2025',
            r'Fall.*Winter.*2025',
            r'New.*Collection.*AW25',
            r'Autumn.*Winter.*2025.*Collection'
        ]
        
        is_aw25_page = any(re.search(pattern, content, re.IGNORECASE) for pattern in aw25_indicators)
        
        # Find product blocks
        # Pattern to match complete product blocks
        product_block_pattern = r'<div class="product-card item product product-item "[^>]*data-sku="(ST[^"]+)"[^>]*>.*?</div></li>'
        
        product_blocks = re.findall(product_block_pattern, content, re.DOTALL)
        
        # For each product block, extract details
        for block in product_blocks:
            sku_match = re.search(r'data-sku="(ST[^"]+)"', block)
            if not sku_match:
                continue
                
            sku = sku_match.group(1)
            
            # Extract URL
            url_match = re.search(r'href="([^"]+)"', block)
            url = url_match.group(1) if url_match else ''
            
            # Extract alt text
            alt_match = re.search(r'alt="([^"]+)"', block)
            alt_text = alt_match.group(1) if alt_match else ''
            
            # Extract title text
            title_match = re.search(r'title="([^"]+)"', block)
            title_text = title_match.group(1) if title_match else ''
            
            # Parse product information from alt/title
            product_name = ''
            color = ''
            product_type = ''
            gender = ''
            fit = ''
            
            # Use title or alt text to extract info
            text_to_parse = title_text or alt_text
            
            # Format: "PRODUCT NAME - COLOR - TYPE - GENDER"
            if ' - ' in text_to_parse:
                parts = text_to_parse.split(' - ')
                
                if len(parts) >= 1:
                    product_name = parts[0].replace('&#x20;', ' ').strip()
                
                if len(parts) >= 2:
                    color = parts[1].replace('&#x20;', ' ').strip()
                
                if len(parts) >= 3:
                    type_part = parts[2].replace('&#x20;', ' ').upper()
                    if 'TEE-SHIRTS' in type_part:
                        product_type = 'T-SHIRT'
                    elif 'POLOS' in type_part:
                        product_type = 'POLO'
                    elif 'OXFORD SHIRTS' in type_part:
                        product_type = 'OXFORD SHIRT'
                    elif 'DENIM SHIRTS' in type_part:
                        product_type = 'DENIM SHIRT'
                    elif 'SHIRTS' in type_part and 'DENIM' not in type_part and 'OXFORD' not in type_part:
                        product_type = 'SHIRT'
                    elif 'SWEATSHIRTS' in type_part:
                        product_type = 'SWEATSHIRT'
                    elif 'HOODIES' in type_part:
                        product_type = 'HOODIE'
                    elif 'JACKETS' in type_part:
                        if 'DENIM' in type_part:
                            product_type = 'DENIM JACKET'
                        else:
                            product_type = 'JACKET'
                    elif 'TROUSERS' in type_part:
                        if 'CHINO' in type_part:
                            product_type = 'CHINO TROUSERS'
                        else:
                            product_type = 'TROUSERS'
                    elif 'JEANS' in type_part:
                        product_type = 'JEANS'
                    elif 'SHORTS' in type_part:
                        product_type = 'SHORTS'
                    elif 'BODYSUITS' in type_part:
                        product_type = 'BODYSUIT'
                    elif 'DRESSES' in type_part:
                        product_type = 'DRESS'
                    elif 'SKIRTS' in type_part:
                        product_type = 'SKIRT'
                    else:
                        product_type = type_part
                
                if len(parts) >= 4:
                    gender_part = parts[3].lower()
                    if 'men' in gender_part:
                        gender = 'MEN'
                    elif 'women' in gender_part:
                        gender = 'WOMEN'
                    elif 'unisex' in gender_part:
                        gender = 'UNISEX'
                    elif 'kids' in gender_part or 'children' in gender_part:
                        gender = 'KIDS'
            
            # Extract image URL to get more details
            img_match = re.search(r'src="([^"]+TechnicalNames/[^"]+)"', block)
            img_url = img_match.group(1) if img_match else ''
            
            # Try to extract weight/GSM from filename or nearby text
            weight = None
            
            # Sizes not visible in listing, need to be fetched individually
            sizes = []
            
            # Create product object
            product = {
                'name': product_name,
                'sku': sku,
                'url': url,
                'product_type': product_type,
                'color': color,
                'colors': [color] if color else [],
                'gender': gender,
                'sizes': sizes,
                'weight': weight,
                'fit': fit,
                'image_url': img_url,
                'is_aw25': is_aw25_page,
                'page': page_num
            }
            
            all_products.append(product)
    
    return all_products

# Main extraction
all_products = extract_detailed_products()

# Get unique product types and counts
product_types = {}
for p in all_products:
    pt = p['product_type']
    product_types[pt] = product_types.get(pt, 0) + 1

print("\nProduct Type Distribution:")
for pt, count in sorted(product_types.items()):
    print(f"  {pt}: {count}")

# Save to JSON
output_file = Path(__file__).resolve().parent / 'stanley_stella_complete_products.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_products, f, indent=2, ensure_ascii=False)

print(f"\nTotal products: {len(all_products)}")
print(f"Saved to: {output_file}")

# Show AW25 products
aw25_products = [p for p in all_products if p['is_aw25']]
print(f"\nAW25 Collection Products: {len(aw25_products)}")
for p in aw25_products[:10]:
    print(f"  - {p['sku']}: {p['name']} ({p['product_type']})")

print("\nSample products (first 10):")
for p in all_products[:10]:
    print(f"\nSKU: {p['sku']}")
    print(f"  Name: {p['name']}")
    print(f"  Type: {p['product_type']}")
    print(f"  Color: {p['color']}")
    print(f"  Gender: {p['gender']}")
    print(f"  URL: {p['url']}")
