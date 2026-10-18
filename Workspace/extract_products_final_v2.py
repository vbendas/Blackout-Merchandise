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

def extract_product_type_from_alt(product_chunk):
    """Extract product type from alt attribute"""
    alt_match = re.search(r'alt="[^"]*-\s*([^&;\s]*)', product_chunk)
    if alt_match:
        alt_text = alt_match.group(1).strip().upper()
        
        # Map to standard product types
        if 'TEE-SHIRTS' in alt_text or 'T-SHIRT' in alt_text:
            return 'T-shirt'
        elif 'SWEATSHIRTS' in alt_text or 'HOODIE' in alt_text:
            return 'Sweatshirt' if 'HOODIE' not in alt_text else 'Hoodie'
        elif 'POLO' in alt_text:
            return 'Polo'
        elif 'SHIRTS' in alt_text:
            return 'Shirt'
        elif 'PANTS' in alt_text or 'TROUSERS' in alt_text:
            return 'Pants'
        elif 'JOGGERS' in alt_text or 'JAMMER' in alt_text or 'TRAINERS' in alt_text:
            return 'Pants'
        elif 'T-SHIRTS' in alt_text:
            return 'T-shirt'
        elif 'DRESS' in alt_text:
            return 'Dress'
        elif 'JACKET' in alt_text or 'BLAZER' in alt_text or 'OUTERWEAR' in alt_text:
            return 'Outerwear'
        elif 'SHORTS' in alt_text:
            return 'Shorts'
        elif 'TANK' in alt_text:
            return 'Tank top'
        elif 'BIB' in alt_text or 'BODY' in alt_text:
            return 'Babywear'
        elif 'BEANIE' in alt_text or 'HAT' in alt_text or 'CAP' in alt_text:
            return 'Accessory'
        elif 'BAG' in alt_text or 'TOTE' in alt_text or 'DUFFEL' in alt_text or 'BACKPACK' in alt_text:
            return 'Accessory'
        elif 'PENCIL' in alt_text:
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
            r'data-product-name="([^"]*)"',
            r'<a[^>]*>\s*([^<\s]*)\s*</a>'
        ]
        
        for pattern in name_patterns:
            name_match = re.search(pattern, product_chunk)
            if name_match:
                name = clean_text(name_match.group(1))
                break
        
        # Extract product type from alt text
        product_type = extract_product_type_from_alt(product_chunk)
        
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
        
        # Special case for products without clear type (accessories, babywear)
        if not product_type:
            if any(x in sku.upper() for x in ['STAU', 'STBB']):
                if 'BIB' in sku.upper() or 'BODY' in sku.upper():
                    product_type = 'Babywear'
                else:
                    product_type = 'Accessory'
            elif 'TUMBLER' in sku.upper():
                product_type = 'Babywear'
        
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
    output_file = str(Path(__file__).resolve().parent / 'stanley_stella_products_final_v2.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_products, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Total unique products: {len(unique_products)}")
    print(f"\nProduct type breakdown:")
    for ptype, count in sorted(type_counts.items()):
        print(f"  {ptype}: {count}")
    print(f"\nAW25 collection products: {aw25_count}")
    print(f"\nProducts with names: {sum(1 for p in unique_products if p['name'])}")
    print(f"Products with colors: {sum(1 for p in unique_products if p['colors'])}")
    print(f"Products with GSM weight: {sum(1 for p in unique_products if p['weight_gsm'])}")
    print(f"\nProducts saved to: {output_file}")
    
    # Also create a simple list for easy access
    simple_list_file = str(Path(__file__).resolve().parent / 'stanley_stella_product_urls.txt')
    with open(simple_list_file, 'w', encoding='utf-8') as f:
        for p in unique_products:
            f.write(f"{p['sku']}|{p['url']}|{p['name']}|{p['type']}|{p['is_aw25']}\n")
    
    print(f"\nSimple URL list saved to: {simple_list_file}")

if __name__ == "__main__":
    main()
