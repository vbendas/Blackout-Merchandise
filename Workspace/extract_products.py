#!/usr/bin/env python3
import json
import re
from pathlib import Path

def extract_all_skus():
    """Extract all SKUs from the HTML files"""
    all_skus = []
    
    files = [
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12',
        '/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc'
    ]
    
    for i, file in enumerate(files, 1):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all SKUs
        skus = re.findall(r'data-sku="(ST[^"]+)"', content)
        
        # Find all URLs
        urls = re.findall(r'href="(https://stanleystella\.com/[^"]+)"', content)
        
        # Find all product names from alt/title
        alts = re.findall(r'alt="([^"]*)"', content)
        
        print(f"\nPage {i}:")
        print(f"  SKUs found: {len(skus)}")
        print(f"  URLs found: {len(urls)}")
        
        for j, sku in enumerate(skus[:36]):  # First 36 per page
            product = {
                'sku': sku,
                'page': i,
                'position': j + 1
            }
            
            # Try to find corresponding URL
            if j < len(urls):
                product['url'] = urls[j]
            
            # Try to extract name from alt if available
            if j < len(alts):
                alt = alts[j]
                # Extract product name from alt text
                # Format: "PRODUCT NAME - COLOR - TYPE - GENDER"
                if ' - ' in alt:
                    parts = alt.split(' - ')
                    if len(parts) >= 3:
                        product['name'] = parts[0].strip()
                        product['color'] = parts[1].strip()
                        # Extract type from the type part
                        type_part = parts[2]
                        if 'TEE-SHIRTS' in type_part:
                            product['type'] = 'T-SHIRT'
                        elif 'POLOS' in type_part:
                            product['type'] = 'POLO'
                        elif 'SHIRTS' in type_part:
                            product['type'] = 'SHIRT'
                        elif 'SWEATSHIRTS' in type_part:
                            product['type'] = 'SWEATSHIRT'
                        elif 'HOODIES' in type_part:
                            product['type'] = 'HOODIE'
                        elif 'JACKETS' in type_part:
                            product['type'] = 'JACKET'
                        elif 'TROUSERS' in type_part:
                            product['type'] = 'TROUSERS'
                        elif 'JEANS' in type_part:
                            product['type'] = 'JEANS'
                        elif 'SHORTS' in type_part:
                            product['type'] = 'SHORTS'
                        else:
                            product['type'] = 'UNKNOWN'
                
            all_skus.append(product)
    
    return all_skus

# Extract all products
products = extract_all_skus()

# Save to JSON
output_file = Path(__file__).resolve().parent / 'stanley_stella_all_products.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print(f"\nTotal products extracted: {len(products)}")
print(f"Saved to: {output_file}")

# Show sample
print("\nSample products:")
for p in products[:10]:
    print(f"  {p['sku']}: {p.get('name', 'N/A')} - {p.get('type', 'N/A')}")
