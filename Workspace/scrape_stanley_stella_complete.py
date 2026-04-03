#!/usr/bin/env python3
import json
import csv
import requests
import os
import re
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Base URL
base_url = "https://stanleystella.com/en-eu/collection/collection"

# Session for requests
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def get_page_products(page_num=None):
    """Extract products from a collection page"""
    url = base_url if page_num == 1 else f"{base_url}?p={page_num}"
    
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        products = []
        
        # Find all product cards
        product_cards = soup.find_all('div', class_='product-card')
        
        for card in product_cards:
            try:
                # Extract SKU
                sku_elem = card.get('data-sku')
                if not sku_elem:
                    continue
                
                # Extract product name
                name_elem = card.find('a', class_='product-item-link')
                if not name_elem:
                    continue
                name = name_elem.get_text(strip=True)
                
                # Extract URL
                product_url = urljoin(base_url, name_elem.get('href'))
                
                # Extract product type from URL path
                path_parts = name_elem.get('href', '').split('/')
                if len(path_parts) > 1:
                    product_name = path_parts[-1]
                    # Check URL for type indicators
                    if '-sttu' in product_name or '-sttw' in product_name:
                        product_type = "T-shirts"
                    elif '-stsu' in product_name or '-stsw' in product_name:
                        product_type = "Sweatshirts"
                    elif '-stww' in product_name or '-stmw' in product_name:
                        product_type = "Shirts"
                    elif '-stpu' in product_name:
                        product_type = "Polos"
                    elif '-stju' in product_name:
                        product_type = "Jackets"
                    elif '-stmu' in product_name:
                        product_type = "Pants"
                    else:
                        product_type = "Unknown"
                else:
                    product_type = "Unknown"
                
                # Extract weight
                weight = ""
                weight_text = card.get_text()
                weight_match = re.search(r'(\d+)\s*GSM', weight_text)
                if weight_match:
                    weight = f"{weight_match.group(1)} GSM"
                
                # Extract sizes
                sizes = ""
                sizes_match = re.search(r'([X]*[SML]+\s*[-]\s*[X]*[SML]+|[X]*[SML]+\s*[-]\s*\d+[X]*[SML]+|\d+\s*[-]\s*\d+)', weight_text)
                if sizes_match:
                    sizes = sizes_match.group(1)
                
                # Extract colors
                colors = []
                color_swatches = card.find_all('a', class_='swatch-option')
                for swatch in color_swatches:
                    color_name = swatch.get('title')
                    if color_name:
                        colors.append(color_name)
                
                products.append({
                    'sku': sku_elem,
                    'name': name,
                    'url': product_url,
                    'product_type': product_type,
                    'sizes': sizes,
                    'weight': weight,
                    'colors': colors
                })
                
            except Exception as e:
                print(f"Error extracting product from card: {e}")
                continue
        
        print(f"✓ Page {page_num}: Found {len(products)} products")
        return products
        
    except Exception as e:
        print(f"✗ Error fetching page {page_num}: {e}")
        return []

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
        desc_selectors = [
            'div.product-description',
            'div.description',
            'div[itemprop="description"]',
            '.product-info .description'
        ]
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                details['description'] = desc_elem.get_text(strip=True)
                break
        
        # Extract composition/materials
        comp_selectors = [
            'div.composition',
            'div.material',
            'div[itemprop="material"]',
            '.product-info .composition'
        ]
        for selector in comp_selectors:
            comp_elem = soup.select_one(selector)
            if comp_elem:
                details['composition'] = comp_elem.get_text(strip=True)
                break
        
        # Extract weight if not found earlier
        if not details['weight']:
            weight_selectors = [
                '.weight',
                '[data-weight]',
                'span:contains("GSM")'
            ]
            for selector in weight_selectors:
                weight_elem = soup.select_one(selector)
                if weight_elem:
                    weight_text = weight_elem.get_text(strip=True)
                    weight_match = re.search(r'(\d+)\s*GSM', weight_text)
                    if weight_match:
                        details['weight'] = f"{weight_match.group(1)} GSM"
                        break
        
        # Extract colors from product page
        color_selectors = [
            '.color-swatch',
            '.swatch-option',
            '.color-option'
        ]
        for selector in color_selectors:
            swatches = soup.select(selector)
            for swatch in swatches:
                color_name = swatch.get('title') or swatch.get('data-color') or swatch.get_text(strip=True)
                if color_name and color_name not in details['colors']:
                    details['colors'].append(color_name)
        
        # Extract care instructions
        care_selectors = [
            'div.care',
            'div.care-instructions',
            '.care-info'
        ]
        for selector in care_selectors:
            care_elem = soup.select_one(selector)
            if care_elem:
                details['care_instructions'] = care_elem.get_text(strip=True)
                break
        
        return details
        
    except Exception as e:
        print(f"✗ Error scraping {url}: {e}")
        return None

def main():
    print("Starting to scrape Stanley Stella AW25 Collection...")
    
    all_products = []
    
    # Scrape all 4 pages
    for page in range(1, 5):
        print(f"\n=== Scraping Page {page}/4 ===")
        products = get_page_products(page)
        all_products.extend(products)
        time.sleep(1)  # Be respectful
    
    print(f"\n✓ Total products found: {len(all_products)}")
    
    # Get detailed information for each product
    print("\n=== Getting Detailed Product Information ===")
    
    # Create CSV file
    csv_file = 'stanley_stella_products_detailed.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'SKU', 'Name', 'URL', 'Product Type', 'Description', 'Composition',
            'Fit', 'Sizes', 'Weight', 'Colors', 'Care Instructions', 'Sustainability', 'AW25_Collection'
        ])
        
        for i, product in enumerate(all_products, 1):
            print(f"\n[{i}/{len(all_products)}] Processing: {product['name']} ({product['sku']})")
            
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
                    details['fit'],
                    details['sizes'] or product.get('sizes', ''),
                    details['weight'] or product.get('weight', ''),
                    colors_str,
                    details['care_instructions'],
                    details['sustainability'],
                    'Yes'  # All products are from AW25 collection
                ])
            
            # Be respectful to the server
            time.sleep(0.5)
    
    # Also save as JSON for easier processing
    with open('stanley_stella_products_complete.json', 'w', encoding='utf-8') as f:
        # Add AW25 flag to all products
        for product in all_products:
            product['aw25_collection'] = True
        json.dump(all_products, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Completed!")
    print(f"✓ CSV saved as: {csv_file}")
    print(f"✓ JSON saved as: stanley_stella_products_complete.json")

if __name__ == "__main__":
    main()