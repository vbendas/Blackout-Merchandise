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
    
    # Look for complete product cards
    # Pattern to find entire product card
    product_card_pattern = r'<div[^>]*class="product-card item product product-item"[^>]*data-sku="([^"]*)"[^>]*>.*?</div>\s*</div>\s*</div>\s*</li>'
    
    for match in re.finditer(product_card_pattern, content, re.DOTALL):
        product_html = match.group(0)
        sku = match.group(1)
        
        # Extract URL
        url_match = re.search(r'href="([^"]*en-eu/[^"]*)"', product_html)
        url = url_match.group(1) if url_match else ""
        
        # Extract product name - try multiple patterns
        name = ""
        name_patterns = [
            r'<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*>\s*([^<\s]*)\s*</a>',
            r'<a[^>]*>\s*([^<\s]*)\s*</a>',
            r'data-product-name="([^"]*)"',
            r'title="([^"]*)"[^>]*class="[^"]*product-item-link'
        ]
        
        for pattern in name_patterns:
            name_match = re.search(pattern, product_html)
            if name_match:
                name = html.unescape(name_match.group(1)).strip()
                # Clean up extra spaces and line breaks
                name = re.sub(r'\s+', ' ', name)
                break
        
        # If still no name, try to get it from the alt text
        if not name:
            alt_match = re.search(r'alt="([^"]*)"', product_html)
            if alt_match:
                alt_text = html.unescape(alt_match.group(1))
                # Extract first part before the dashes
                name = re.split(r'\s*-\s*', alt_text)[0].strip()
        
        # Extract product type from multiple sources
        product_type = ""
        
        # First check explicit type labels
        if '<span>T-shirts</span>' in product_html:
            product_type = 'T-shirt'
        elif '<span>Sweatshirts</span>' in product_html:
            product_type = 'Sweatshirt'
        elif '<span>Polos</span>' in product_html:
            product_type = 'Polo'
        elif '<span>Shirts</span>' in product_html:
            product_type = 'Shirt'
        elif '<span>Outerwear</span>' in product_html:
            product_type = 'Outerwear'
        elif '<span>Pants' in product_html or '<span>Shorts</span>' in product_html:
            if 'Shorts' in product_html:
                product_type = 'Shorts'
            else:
                product_type = 'Pants'
        elif '<span>Hoodies</span>' in product_html:
            product_type = 'Hoodie'
        elif '<span>Tank tops</span>' in product_html:
            product_type = 'Tank top'
        elif '<span>Dresses</span>' in product_html:
            product_type = 'Dress'
        else:
            # Try to get from alt text or URL
            alt_match = re.search(r'alt="[^"]*\s*-\s*([^&;\s]*)', product_html)
            if alt_match:
                type_text = alt_match.group(1).strip()
                # Map common patterns
                if any(x in type_text.upper() for x in ['TEE', 'T-SHIRT', 'TSHIRT']):
                    product_type = 'T-shirt'
                elif any(x in type_text.upper() for x in ['SWEAT', 'HOODIE']):
                    product_type = 'Sweatshirt' if 'HOODIE' not in type_text.upper() else 'Hoodie'
                elif 'POLO' in type_text.upper():
                    product_type = 'Polo'
                elif 'SHIRT' in type_text.upper():
                    product_type = 'Shirt'
                elif 'PANTS' in type_text.upper() or 'TROUSER' in type_text.upper():
                    product_type = 'Pants'
                elif 'SHORTS' in type_text.upper():
                    product_type = 'Shorts'
                elif 'TANK' in type_text.upper():
                    product_type = 'Tank top'
                elif 'DRESS' in type_text.upper():
                    product_type = 'Dress'
                elif 'JACKET' in type_text.upper() or 'OUTER' in type_text.upper():
                    product_type = 'Outerwear'
                else:
                    product_type = type_text
        
        # Extract GSM weight
        gsm_match = re.search(r'(\d+)\s+GSM', product_html)
        gsm = gsm_match.group(1) if gsm_match else ""
        
        # Extract colors - improved pattern
        colors = []
        # Look for color swatch links
        color_pattern = r'<a[^>]*class="[^"]*swatch-option[^"]*"[^>]*title="([^"]*)"'
        for color_match in re.finditer(color_pattern, product_html):
            color_name = html.unescape(color_match.group(1))
            if color_name and color_name not in colors:
                colors.append(color_name)
        
        # If no colors found with swatch pattern, try alternative
        if not colors:
            color_pattern2 = r'title="([^"]*)"[^>]*class="[^"]*swatch_color'
            for color_match in re.finditer(color_pattern2, product_html):
                color_name = html.unescape(color_match.group(1))
                if color_name and color_name not in colors:
                    colors.append(color_name)
        
        # Check if it's AW25 collection
        is_aw25 = 'aw25' in url.lower() or 'AW25' in product_context or 'aw25' in filepath.lower()
        
        # Clean up name
        if name:
            name = re.sub(r'\s+', ' ', name).strip()
        
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
    output_file = '/Users/victorbendas/Documents/GitHub/Merch-From/Workspace/stanley_stella_products_v2.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_products, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal unique products: {len(unique_products)}")
    print(f"Products with names: {sum(1 for p in unique_products if p['name'])}")
    print(f"Products with colors: {sum(1 for p in unique_products if p['colors'])}")
    print(f"AW25 collection products: {sum(1 for p in unique_products if p['is_aw25'])}")
    print(f"Products saved to: {output_file}")

if __name__ == "__main__":
    main()
