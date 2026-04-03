#!/usr/bin/env python3
import json
import os
import requests
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import zipfile
import shutil

# Load product data
with open('stanley_stella_products_complete.json', 'r') as f:
    products = json.load(f)

def setup_driver():
    """Setup Chrome WebDriver with options"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def download_product_images(driver, sku, product_name):
    """Download images for a specific product from the picture search tool"""
    url = "https://stanleystella.com/en-eu/picture-search-tool?picture-search-tool#collections=AW25&categories=T-shirts&type=P&resolution=low&naming=codes"
    
    try:
        print(f"\nProcessing: {product_name} ({sku})")
        driver.get(url)
        time.sleep(3)  # Wait for page to load
        
        # Wait for the page to be ready
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "picture-search-tool"))
        )
        
        # Find the product search input
        try:
            search_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((.CSS_SELECTOR, "input[placeholder*='Search'], input[type='search'], .search-input"))
            )
            
            # Clear and enter SKU
            search_input.clear()
            search_input.send_keys(sku)
            time.sleep(2)
            
            # Look for search button or wait for results
            try:
                search_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], .search-button, .btn-search")
                search_button.click()
            except NoSuchElementException:
                pass  # Search might trigger automatically
            
            time.sleep(3)  # Wait for search results
            
            # Look for the product in the results
            product_elements = driver.find_elements(By.CSS_SELECTOR, ".product-item, .product-card, .style-item")
            product_found = None
            
            for elem in product_elements:
                if sku.lower() in elem.text.lower() or product_name.lower() in elem.text.lower():
                    product_found = elem
                    break
            
            if product_found:
                print(f"  ✓ Found product in search results")
                
                # Look for download options
                packshot_checkbox = None
                studio_checkbox = None
                
                try:
                    # Look for checkboxes
                    checkboxes = driver.find_elements(By.CSS_SELECTOR, "input[type='checkbox']")
                    for checkbox in checkboxes:
                        label = checkbox.find_element(By.XPATH, "../label").text.lower() if checkbox.find_elements(By.XPATH, "../label") else ""
                        if "packshot" in label:
                            packshot_checkbox = checkbox
                        elif "studio" in label:
                            studio_checkbox = checkbox
                    
                    # Select both packshots and studio
                    if packshot_checkbox:
                        if not packshot_checkbox.is_selected():
                            packshot_checkbox.click()
                        print(f"  ✓ Selected packshots")
                    
                    if studio_checkbox:
                        if not studio_checkbox.is_selected():
                            studio_checkbox.click()
                        print(f"  ✓ Selected studio photos")
                    
                    # Look for download button
                    download_button = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, ".download-btn, .btn-download, button[type='submit']:contains('Download')"))
                    )
                    download_button.click()
                    
                    print(f"  ✓ Download initiated")
                    
                    # Wait for download to complete (check for zip files)
                    time.sleep(5)
                    
                    # Check downloads folder for zip file
                    downloads_path = os.path.expanduser("~/Downloads")
                    zip_files = [f for f in os.listdir(downloads_path) if f.endswith('.zip') and sku.lower() in f.lower()]
                    
                    if zip_files:
                        latest_zip = max(zip_files, key=lambda f: os.path.getmtime(os.path.join(downloads_path, f)))
                        zip_path = os.path.join(downloads_path, latest_zip)
                        
                        # Create product folder
                        product_folder = f"Stanley Stella/{product_name}_{sku}"
                        os.makedirs(product_folder, exist_ok=True)
                        
                        # Extract zip
                        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                            zip_ref.extractall(product_folder)
                        
                        # Organize into packshots and studio folders
                        packshot_folder = os.path.join(product_folder, "packshots")
                        studio_folder = os.path.join(product_folder, "studio")
                        
                        os.makedirs(packshot_folder, exist_ok=True)
                        os.makedirs(studio_folder, exist_ok=True)
                        
                        # Move files to appropriate folders
                        for file in os.listdir(product_folder):
                            file_path = os.path.join(product_folder, file)
                            if os.path.isfile(file_path) and file.endswith(('.jpg', '.jpeg', '.png')):
                                if 'packshot' in file.lower():
                                    shutil.move(file_path, os.path.join(packshot_folder, file))
                                elif 'studio' in file.lower():
                                    shutil.move(file_path, os.path.join(studio_folder, file))
                        
                        # Remove the zip file
                        os.remove(zip_path)
                        
                        print(f"  ✓ Images organized in: {product_folder}")
                        return True
                    
                except TimeoutException:
                    print(f"  ✗ Timeout waiting for download elements")
                    return False
                except Exception as e:
                    print(f"  ✗ Error during download: {e}")
                    return False
            else:
                print(f"  ✗ Product not found in search results")
                return False
                
        except TimeoutException:
            print(f"  ✗ Timeout waiting for search input")
            return False
            
    except Exception as e:
        print(f"  ✗ Error processing {sku}: {e}")
        return False

def main():
    print("Starting image download for Stanley Stella AW25 Collection...")
    print(f"Total products to process: {len(products)}")
    
    # Create main folder
    os.makedirs("Stanley Stella", exist_ok=True)
    
    # Setup WebDriver
    driver = setup_driver()
    
    success_count = 0
    error_count = 0
    
    try:
        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] Processing: {product['name']} ({product['sku']})")
            
            success = download_product_images(driver, product['sku'], product['name'])
            
            if success:
                success_count += 1
            else:
                error_count += 1
            
            # Wait between downloads to be respectful
            time.sleep(2)
    
    finally:
        driver.quit()
    
    print(f"\n✓ Download completed!")
    print(f"✓ Successfully downloaded: {success_count} products")
    print(f"✗ Failed downloads: {error_count} products")
    print(f"✓ All images saved in 'Stanley Stella' folder")

if __name__ == "__main__":
    main()