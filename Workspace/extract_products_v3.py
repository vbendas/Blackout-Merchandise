#!/usr/bin/env python3
import re
import json
import html
from pathlib import Path

def clean_text(text):
    """Clean up text by removing extra spaces and line breaks"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', html.unescape(text).strip())

def extract_product_type(product_chunk):
    """Extract product type from multiple sources"""
    # Method 1: Check explicit type labels
    type_mapping = {
        'T-shirts': 'T-shirt',
        'Sweatshirts': 'Sweatshirt', 
        'Polos': 'Polo',
        'Shirts': 'Shirt',
        'Outerwear': 'Outerwear',
        'Hoodies': 'Hoodie',
        'Tank tops': 'Tank top',
        'Dresses': 'Dress'
    }
    
    for label, clean_type in type_mapping.items():
        if f'<span>{label}</span>' in product_chunk:
            return clean_type
    
    # Method 2: Check for Pants/Shorts
    if '<span>Pants' in product_chunk or '<span>Shorts</span>' in product_chunk:
        if 'Shorts' in product_chunk:
            return 'Shorts'
        return 'Pants'
    
    # Method 3: From alt text
    alt_match = re.search(r'alt="[^"]*\s*-\s*([^&;\s]*)', product_chunk)
    if alt_match:
        type_text = alt_match.group(1).strip().upper()
        
        # Map patterns
        if any(x in type_text for x in ['TEE', 'T-SHIRT', 'TSHIRT']):
            return 'T-shirt'
        elif any(x in type_text for x in ['HOODIE']):
            return 'Hoodie'
        elif any(x in type_text for x in ['SWEAT', 'FLEECE']):
            return 'Sweatshirt'
        elif 'POLO' in type_text:
            return 'Polo'
        elif any(x in type_text for x in ['SHIRT']):
            return 'Shirt'
        elif any(x in type_text for x in ['PANTS', 'TROUSER', 'JOGGER', 'JAMMER', 'TRAINER']):
            return 'Pants'
        elif 'SHORTS' in type_text:
            return 'Shorts'
        elif 'TANK' in type_text:
            return 'Tank top'
        elif 'DRESS' in type_text:
            return 'Dress'
        elif any(x in type_text for x in ['JACKET', 'OUTER', 'BLAZER']):
            return 'Outerwear'
        elif any(x in type_text for x in ['BIB', 'BEANIE', 'HAT', 'CAP']):
            return 'Accessory'
        elif any(x in type_text for x in ['BAG', 'TOTE', 'DUFFLE', 'BACKPACK']):
            return 'Accessory'
        else:
            return type_text
    
    # Method 4: From URL or name
    # Extract name first
    name_match = re.search(r'class="product-item-link[^"]*"[^>]*>\s*([^<\s]*)', product_chunk)
    if name_match:
        name = name_match.group(1).strip().upper()
        if 'TEE' in name or 'T-SHIRT' in name:
            return 'T-shirt'
        elif 'HOODIE' in name:
            return 'Hoodie'
        elif 'SWEAT' in name:
            return 'Sweatshirt'
        elif 'POLO' in name:
            return 'Polo'
        elif 'SHIRT' in name:
            return 'Shirt'
        elif 'PANTS' in name or 'TROUSER' in name:
            return 'Pants'
        elif 'SHORTS' in name:
            return 'Shorts'
        elif 'TANK' in name:
            return 'Tank top'
        elif 'DRESS' in name:
            return 'Dress'
        elif 'JACKET' in name or 'OUTER' in name:
            return 'Outerwear'
    
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
    output_file = str(Path(__file__).resolve().parent / 'stanley_stella_products_complete.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_products, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Total unique products: {len(unique_products)}")
    print(f"\nProduct type breakdown:")
    for ptype, count in sorted(type_counts.items()):
        print(f"  {ptype}: {count}")
    print(f"\nAW25 collection products: {aw25_count}")
    print(f"\nProducts saved to: {output_file}")

if __name__ == "__main__":
    main()
