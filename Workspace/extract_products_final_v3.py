#!/usr/bin/env python3
import re
import json
import html
from pathlib import Path

def clean_text(text):
    """Clean up text by removing extra spaces and line breaks"""
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'&#x20;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_product_type(product_chunk):
    """Extract product type from multiple sources"""
    # Method 1: From alt text
    alt_match = re.search(r'alt="[^"]*-\s*([^&;\s]*)', product_chunk)
    if alt_match:
        alt_text = alt_match.group(1).strip().upper()
        
        # Direct mapping from alt text patterns
        if 'TEE-SHIRTS' in alt_text:
            return 'T-shirt'
        elif 'SWEATSHIRTS' in alt_text:
            return 'Sweatshirt'
        elif 'HOODIES' in alt_text or 'HOODIE' in alt_text:
            return 'Hoodie'
        elif 'POLO-SHIRTS' in alt_text or 'POLO' in alt_text:
            return 'Polo'
        elif 'SHIRTS' in alt_text and 'TEE-SHIRTS' not in alt_text and 'POLO-SHIRTS' not in alt_text:
            return 'Shirt'
        elif 'TROUSERS' in alt_text or 'PANTS' in alt_text:
            return 'Pants'
        elif 'JOGGERS' in alt_text or 'JAMMER' in alt_text or 'TRAINERS' in alt_text:
            return 'Pants'
        elif 'DRESS' in alt_text:
            return 'Dress'
        elif 'JACKET' in alt_text or 'BLAZER' in alt_text or 'OUTERWEAR' in alt_text:
            return 'Outerwear'
        elif 'SHORTS' in alt_text:
            return 'Shorts'
        elif 'TANK' in alt_text:
            return 'Tank top'
    
    # Method 2: From URL patterns
    url_match = re.search(r'/([a-z]+)-[a-z0-]+', product_chunk)
    if url_match:
        url_part = url_match.group(1).upper()
        if 'TEE' in url_part or 'TSHIRT' in url_part:
            return 'T-shirt'
        elif 'SWEAT' in url_part or 'HOOD' in url_part:
            return 'Sweatshirt' if 'HOOD' not in url_part else 'Hoodie'
        elif 'POLO' in url_part:
            return 'Polo'
        elif 'SHIRT' in url_part:
            return 'Shirt'
        elif 'PANT' in url_part or 'TROUS' in url_part:
            return 'Pants'
        elif 'DRESS' in url_part:
            return 'Dress'
        elif 'JACKET' in url_part or 'BLAZ' in url_part:
            return 'Outerwear'
        elif 'SHORT' in url_part:
            return 'Shorts'
        elif 'TANK' in url_part:
            return 'Tank top'
    
    # Method 3: From SKU prefixes
    sku_match = re.search(r'data-sku="([A-Z]{2,4})', product_chunk)
    if sku_match:
        sku_prefix = sku_match.group(1)
        if sku_prefix.startswith('STT'):
            return 'T-shirt'
        elif sku_prefix.startswith('STS'):
            return 'Sweatshirt' if sku_prefix not in ['STSU'] else 'Shirt'
        elif sku_prefix.startswith('STP'):
            return 'Polo'
        elif sku_prefix.startswith('STW'):
            return 'Shirt'
        elif sku_prefix.startswith('STB'):
            return 'Pants'
        elif sku_prefix.startswith('STJ'):
            return 'Jacket' or 'Outerwear'
        elif sku_prefix.startswith('STD'):
            return 'Dress'
        elif sku_prefix.startswith('STH'):
            return 'Hoodie'
        elif sku_prefix.startswith('STA'):
            return 'Accessory'
        elif sku_prefix.startswith('STU'):
            return 'Accessory'
        elif sku_prefix.startswith('STBB'):
            return 'Babywear'
        elif sku_prefix.startswith('STAU'):
            return 'Accessory'
    
    return ""

def extract_products_from_file(filepath):
    """Extract products from a single HTML file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    products = []
    
    # Find all product SKUs
    sku_pattern = r'data-sku="([^"]*)"'
    
    for sku_match in re.finditer(sku_pattern, content):
        sku = sku_match.group(1)
        
        # Get a large chunk around the SKU
        start = max(0, sku_match.start() - 1000)
        end = min(len(content), sku_match.end() + 5000)
        product_chunk = content[start:end]
        
        # Extract URL
        url_match = re.search(r'href="(https://stanleystella\.com/en-eu/[^"]*)"', product_chunk)
        url = url_match.group(1) if url_match else ""
        
        # Extract product name
        name = ""
        name_patterns = [
            r'class="product-item-link[^"]*"[^>]*>\s*([^<\s]*)\s*</a>',
            r'data-product-name="([^"]*)"'
        ]
        
        for pattern in name_patterns:
            name_match = re.search(pattern, product_chunk)
            if name_match:
                name = clean_text(name_match.group(1))
                break
        
        # Extract product type
        product_type = extract_product_type(product_chunk)
        
        # Extract GSM weight
        gsm_match = re.search(r'(\d+)\s+GSM', product_chunk)
        gsm = gsm_match.group(1) if gsm_match else ""
        
        # Extract colors
        colors = []
        color_patterns = [
            r'title="([^"]*)"[^>]*class="[^"]*swatch_color',
            r'class="swatch-option[^"]*"[^>]*title="([^"]*)"'
        ]
        
        for color_pattern in color_patterns:
            for color_match in re.finditer(color_pattern, product_chunk):
                color_name = clean_text(color_match.group(1))
                if color_name and color_name not in colors:
                    colors.append(color_name)
        
        # Check if it's AW25 collection
        is_aw25 = 'aw25' in url.lower() or 'AW25' in product_chunk.lower()
        
        if sku and url:  # Only add if we have essential data
            products.append({
                'name': name,
                'sku': sku,
                'url': url,
                'type': product_type,
                'weight_gsm': gsm,
                'colors': colors,
                'is_aw25': is_aw25
            })
    
    return products

def main():
    all_products = []
    
    # Process all 4 HTML files
    file_paths = [
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc'
    ]
    
    for filepath in file_paths:
        if Path(filepath).exists():
            products = extract_products_from_file(filepath)
            all_products.extend(products)
            print(f"Extracted {len(products)} products from {Path(filepath).name}")
        else:
            print(f"File not found: {filepath}")
    
    # Remove duplicates based on SKU
    seen_skus = set()
    unique_products = []
    for product in all_products:
        if product['sku'] not in seen_skus:
            seen_skus.add(product['sku'])
            unique_products.append(product)
    
    # Sort products by SKU for better organization
    unique_products.sort(key=lambda x: x['sku'])
    
    # Generate statistics
    type_counts = {}
    aw25_count = 0
    for p in unique_products:
        ptype = p.get('type', 'Unknown')
        type_counts[ptype] = type_counts.get(ptype, 0) + 1
        if p.get('is_aw25', False):
            aw25_count += 1
    
    # Save to JSON
    output_file = str(Path(__file__).resolve().parent / 'stanley_stella_products_final_v3.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_products, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Total unique products: {len(unique_products)}")
    print(f"\nProduct type breakdown:")
    for ptype, count in sorted(type_counts.items()):
        if ptype:  # Skip empty types
            print(f"  {ptype}: {count}")
    print(f"\nAW25 collection products: {aw25_count}")
    print(f"\nProducts with names: {sum(1 for p in unique_products if p['name'])}")
    print(f"Products with colors: {sum(1 for p in unique_products if p['colors'])}")
    print(f"Products with GSM weight: {sum(1 for p in unique_products if p['weight_gsm'])}")
    print(f"\nProducts saved to: {output_file}")
    
    # Also create a CSV for easy viewing
    csv_file = str(Path(__file__).resolve().parent / 'stanley_stella_products.csv')
    with open(csv_file, 'w', encoding='utf-8') as f:
        f.write("SKU,Name,URL,Type,Weight (GSM),Colors,AW25\n")
        for p in unique_products:
            colors_str = ';'.join(p['colors'])
            f.write(f"{p['sku']},{p['name']},{p['url']},{p['type']},{p['weight_gsm']},\"{colors_str}\",{p['is_aw25']}\n")
    
    print(f"\nCSV file saved to: {csv_file}")

if __name__ == "__main__":
    main()
