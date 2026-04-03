#!/usr/bin/env python3
import re
import json
import html
from pathlib import Path

def extract_products_from_file(filepath):
    """Extract products from a single HTML file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    products = []
    
    # Split content by product SKU markers
    sku_pattern = r'data-sku="([^"]*)"'
    
    for sku_match in re.finditer(sku_pattern, content):
        sku = sku_match.group(1)
        
        # Get a large chunk around the SKU to work with
        start = max(0, sku_match.start() - 500)
        end = min(len(content), sku_match.end() + 4000)
        product_chunk = content[start:end]
        
        # Extract URL
        url_match = re.search(r'href="(https://stanleystella\.com/en-eu/[^"]*)"', product_chunk)
        url = url_match.group(1) if url_match else ""
        
        # Extract product name
        name = ""
        
        # Method 1: From the product-item-link text
        name_match = re.search(r'class="product-item-link[^"]*"[^>]*>\s*([^<\s]*)', product_chunk)
        if name_match:
            name = html.unescape(name_match.group(1)).strip()
            name = re.sub(r'\s+', ' ', name)
        
        # Method 2: From data-product-name attribute
        if not name:
            name_match = re.search(r'data-product-name="([^"]*)"', product_chunk)
            if name_match:
                name = html.unescape(name_match.group(1)).strip()
        
        # Method 3: From alt attribute (first part before dash)
        if not name:
            alt_match = re.search(r'alt="([^"]*)"', product_chunk)
            if alt_match:
                alt_text = html.unescape(alt_match.group(1))
                # Get first part before any dash
                name = re.split(r'\s*-\s*', alt_text)[0].strip()
        
        # Extract product type
        product_type = ""
        
        # From explicit type labels
        if '<span>T-shirts</span>' in product_chunk:
            product_type = 'T-shirt'
        elif '<span>Sweatshirts</span>' in product_chunk:
            product_type = 'Sweatshirt'
        elif '<span>Polos</span>' in product_chunk:
            product_type = 'Polo'
        elif '<span>Shirts</span>' in product_chunk:
            product_type = 'Shirt'
        elif '<span>Outerwear</span>' in product_chunk:
            product_type = 'Outerwear'
        elif '<span>Shorts</span>' in product_chunk:
            product_type = 'Shorts'
        elif 'Pants' in product_chunk:
            product_type = 'Pants'
        elif '<span>Hoodies</span>' in product_chunk:
            product_type = 'Hoodie'
        elif '<span>Tank tops</span>' in product_chunk:
            product_type = 'Tank top'
        elif '<span>Dresses</span>' in product_chunk:
            product_type = 'Dress'
        else:
            # From alt text
            alt_match = re.search(r'alt="[^"]*\s*-\s*([^&;\s]*)', product_chunk)
            if alt_match:
                type_text = alt_match.group(1).strip().upper()
                # Map to cleaner types
                if 'TEE' in type_text or 'T-SHIRT' in type_text:
                    product_type = 'T-shirt'
                elif 'HOODIE' in type_text:
                    product_type = 'Hoodie'
                elif 'SWEAT' in type_text:
                    product_type = 'Sweatshirt'
                elif 'POLO' in type_text:
                    product_type = 'Polo'
                elif 'SHIRT' in type_text:
                    product_type = 'Shirt'
                elif 'PANTS' in type_text or 'TROUSER' in type_text:
                    product_type = 'Pants'
                elif 'SHORTS' in type_text:
                    product_type = 'Shorts'
                elif 'TANK' in type_text:
                    product_type = 'Tank top'
                elif 'DRESS' in type_text:
                    product_type = 'Dress'
                elif 'JACKET' in type_text or 'OUTER' in type_text:
                    product_type = 'Outerwear'
                else:
                    product_type = type_text
        
        # Extract GSM weight
        gsm_match = re.search(r'(\d+)\s+GSM', product_chunk)
        gsm = gsm_match.group(1) if gsm_match else ""
        
        # Extract colors
        colors = []
        # Pattern for color swatches
        color_pattern = r'title="([^"]*)"[^>]*class="[^"]*swatch_color'
        for color_match in re.finditer(color_pattern, product_chunk):
            color_name = html.unescape(color_match.group(1))
            if color_name and color_name not in colors:
                colors.append(color_name)
        
        # Alternative color pattern
        if not colors:
            color_pattern2 = r'class="swatch-option[^"]*"[^>]*title="([^"]*)"'
            for color_match in re.finditer(color_pattern2, product_chunk):
                color_name = html.unescape(color_match.group(1))
                if color_name and color_name not in colors:
                    colors.append(color_name)
        
        # Check if it's AW25 collection
        is_aw25 = 'aw25' in url.lower() or 'AW25' in product_chunk.lower()
        
        # Clean up data
        name = name.strip() if name else ""
        product_type = product_type.strip() if product_type else ""
        
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
    
    # Save to JSON
    output_file = '/Users/victorbendas/Documents/GitHub/Merch-From/Workspace/stanley_stella_products_final.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_products, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal unique products: {len(unique_products)}")
    print(f"Products with names: {sum(1 for p in unique_products if p['name'])}")
    print(f"Products with colors: {sum(1 for p in unique_products if p['colors'])}")
    print(f"Products with GSM weight: {sum(1 for p in unique_products if p['weight_gsm'])}")
    print(f"AW25 collection products: {sum(1 for p in unique_products if p['is_aw25'])}")
    print(f"\nProducts saved to: {output_file}")

if __name__ == "__main__":
    main()
