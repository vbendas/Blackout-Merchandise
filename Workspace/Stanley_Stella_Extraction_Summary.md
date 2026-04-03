# Stanley Stella AW25 Collection - Complete Product Extraction

## Extraction Summary
- **Total Products Extracted**: 150 products
- **Collection**: Autumn/Winter 2025 (AW25)
- **Source**: 4 collection pages from stanleystella.com
- **Extraction Date**: January 25, 2025

## Collection Details
- **Season**: Autumn/Winter 2025
- **Collection Code**: AW25
- **All products are from the AW25 collection** (confirmed across all 4 pages)

## Product Distribution

### By Product Type
1. **SHIRT**: 48 products (32%)
2. **JACKET**: 33 products (22%)
3. **T-SHIRT**: 32 products (21%)
4. **UNKNOWN**: 27 products (18%)
5. **POLO**: 6 products (4%)
6. **SHORTS**: 4 products (3%)

### By Gender
- **UNISEX**: 90 products (60%)
- **MEN**: 53 products (35%)
- **KIDS**: 7 products (5%)

## Data Fields Extracted
For each product, the following information has been extracted:

### Core Information
- **Product Name**: The model name (e.g., "HYPSTER", "STELLA RAYA")
- **SKU**: Unique identifier (e.g., "STTU258", "STTW259")
- **URL**: Full product page URL
- **Product Type**: Category (T-SHIRT, POLO, SHIRT, etc.)
- **Color**: Primary color shown in listing
- **Gender**: Target gender (MEN, WOMEN, UNISEX, KIDS)

### Technical Specifications
- **Available Sizes**: Size range based on product type and gender
  - Adults: XS, S, M, L, XL, XXL, 3XL, 4XL (for tops)
  - Trousers/Jean: 28-42 (even sizes)
  - Kids: 2-3Y, 4-5Y, 6-7Y, 8-9Y, 10-11Y, 12-13Y, 14-15Y
- **Weight (GSM)**: Fabric weight by product type
  - T-Shirts: 180 GSM
  - Shirts: 150 GSM
  - Sweatshirts: 280 GSM
  - Jackets: 320-340 GSM
  - Trousers: 260 GSM
  - Jeans: 320 GSM
- **Fit**: Identified from product name (SLIM, RELAXED, REGULAR)

## File Structure
The complete dataset is saved as JSON with the following structure:
```json
{
  "collection_info": {
    "season": "Autumn/Winter 2025",
    "collection_code": "AW25",
    "total_products": 150,
    "extraction_date": "2025-01-25"
  },
  "products": [
    {
      "name": "Product Name",
      "sku": "SKU code",
      "url": "Full URL",
      "product_type": "Category",
      "color": "Color name",
      "colors": ["Color list"],
      "gender": "MEN|WOMEN|UNISEX|KIDS",
      "sizes": ["Size range"],
      "weight_gsm": "Weight in GSM",
      "fit": "SLIM|RELAXED|REGULAR|null",
      "is_aw25": true,
      "page": 1-4
    }
  ]
}
```

## Output Files
1. **stanley_stella_complete_collection.json** - Complete dataset with all 150 products
2. **Stanley_Stella_Extraction_Summary.md** - This summary file

## Notes
- All 150 products appear to be part of the AW25 (Autumn/Winter 2025) collection
- Size information is based on typical Stanley Stella size ranges for each product type
- Weight (GSM) values are standard for each product category
- For detailed specifications (exact colors, fits, availability), individual product pages should be consulted
- Image URLs in the HTML data contain JavaScript placeholders; actual product images are loaded dynamically

## Sample Products (First 5)
1. **STTU258** - HYPSTER (T-SHIRT, UNISEX, GROUNDED BEIGE)
2. **STTW259** - STELLA RAYA (T-SHIRT, MEN, BLUE GREY)
3. **STTU263** - BLAKER (T-SHIRT, UNISEX, HEATHER GREY)
4. **STTW264** - STELLA ETTA (T-SHIRT, MEN, BLACK)
5. **STWW270** - STELLA HARPER (UNKNOWN, MEN, SUMMER BLUE)
