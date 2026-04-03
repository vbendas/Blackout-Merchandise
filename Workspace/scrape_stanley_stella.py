#!/usr/bin/env python3
import json
import csv
import requests
import os
import re
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import zipfile

# Load product list
with open('stanley_stella_products.json', 'r') as f:
    products = json.load(f)

# Session for requests
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def get_product_details(url):
    """Extract detailed product information from a product page"""
    try:
        response = session.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {
            'description': '',
            'composition': '',
            'fit': '',
            'sizes': '',
            'weight': '',
            'colors': [],
            'care_instructions': '',
            'sustainability': ''
        }
        
        # Extract description
        desc_elem = soup.find('div', class_='product-description') or soup.find('div', class_='description')
        if desc_elem:
            details['description'] = desc_elem.get_text(strip=True)
        
        # Extract composition/materials
        comp_elem = soup.find('div', class_='composition') or soup.find('div', class_='material')
        if comp_elem:
            details['composition'] = comp_elem.get_text(strip=True)
        
        # Extract fit information
        fit_elem = soup.find('div', class_='fit') or soup.find('span', text=re.compile(r'Fit|fit', re.I))
        if fit_elem:
            details['fit'] = fit_elem.get_text(strip=True)
        
        # Extract size information
        size_elem = soup.find('div', class_='sizes') or soup.find('div', class_='size-guide')
        if size_elem:
            details['sizes'] = size_elem.get_text(strip=True)
        
        # Extract weight
        weight_elem = soup.find('span', text=re.compile(r'\d+\s*GSM', re.I)) or soup.find('div', class_='weight')
        if weight_elem:
            details['weight'] = weight_elem.get_text(strip=True)
        
        # Extract colors
        color_swatches = soup.find_all('div', class_='color-swatch') or soup.find_all('a', class_='color')
        for swatch in color_swatches:
            color_name = swatch.get('title') or swatch.get('data-color') or swatch.get_text(strip=True)
            if color_name:
                details['colors'].append(color_name)
        
        # Extract care instructions
        care_elem = soup.find('div', class_='care') or soup.find('div', class_='care-instructions')
        if care_elem:
            details['care_instructions'] = care_elem.get_text(strip=True)
        
        # Extract sustainability info
        sust_elem = soup.find('div', class_='sustainability') or soup.find('div', class_='eco')
        if sust_elem:
            details['sustainability'] = sust_elem.get_text(strip=True)
        
        print(f"✓ Scraped: {url}")
        return details
        
    except Exception as e:
        print(f"✗ Error scraping {url}: {e}")
        return None

def main():
    print(f"Starting to scrape {len(products)} products...")
    
    # Create CSV file
    csv_file = 'stanley_stella_products_detailed.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'SKU', 'Name', 'URL', 'Product Type', 'Description', 'Composition',
            'Fit', 'Sizes', 'Weight', 'Colors', 'Care Instructions', 'Sustainability'
        ])
        
        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] Processing: {product['name']} ({product['sku']})")
            
            # Get detailed information
            details = get_product_details(product['url'])
            
            if details:
                # Combine basic info with detailed info
                colors_str = '; '.join(details['colors']) if details['colors'] else '; '.join(product.get('colors', []))
                
                writer.writerow([
                    product['sku'],
                    product['name'],
                    product['url'],
                    product['product_type'],
                    details['description'],
                    details['composition'],
                    details['fit'] or product.get('fit', ''),
                    details['sizes'] or product.get('sizes', ''),
                    details['weight'] or product.get('weight', ''),
                    colors_str,
                    details['care_instructions'],
                    details['sustainability']
                ])
            
            # Be respectful to the server
            time.sleep(0.5)
    
    print(f"\n✓ Completed! CSV saved as: {csv_file}")

if __name__ == "__main__":
    main()