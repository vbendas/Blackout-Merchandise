import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
TIMEOUT = 30

def test_list_products_by_store_slug():
    # Helper to create a product
    def create_product(store_slug, name, description, base_cost, retail_price, mockup_url):
        url = f"{BASE_URL}/products/create"
        payload = {
            "storeSlug": store_slug,
            "name": name,
            "description": description,
            "baseCost": base_cost,
            "retailPrice": retail_price,
            "mockupUrl": mockup_url,
        }
        response = requests.post(url, json=payload, auth=AUTH, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()  # expected to return product ID

    # Helper to delete a product by ID
    def delete_product(product_id):
        # No explicit DELETE endpoint given in PRD, so skip deletion
        # If deletion endpoint existed, implement here
        pass

    # Pick a unique store slug for testing
    test_store_slug = "unittest-store-tc003"
    product_id = None

    try:
        # Create a new product for the test store slug
        product_id = create_product(
            store_slug=test_store_slug,
            name="Test Product TC003",
            description="A product for test case TC003",
            base_cost=10.0,
            retail_price=25.0,
            mockup_url="http://example.com/mockup.jpg"
        )
        assert isinstance(product_id, str) and len(product_id) > 0, "Product ID should be a non-empty string"

        # Request listing products for existing store slug with one active product
        list_url = f"{BASE_URL}/products/listByStore"
        params = {"storeSlug": test_store_slug}
        resp = requests.get(list_url, params=params, auth=AUTH, timeout=TIMEOUT)
        resp.raise_for_status()
        products = resp.json()
        assert isinstance(products, list), "Response should be a list"
        assert any(p.get("name") == "Test Product TC003" for p in products), "Created product should be in the list"

        # Request with a non-existing store slug: expect empty list or no products
        params = {"storeSlug": "nonexistent-store-slug-for-tc003"}
        resp = requests.get(list_url, params=params, auth=AUTH, timeout=TIMEOUT)
        resp.raise_for_status()
        products = resp.json()
        assert isinstance(products, list), "Response for non-existent store should be a list"
        assert len(products) == 0, "No products should be returned for non-existent store slug"

        # Request with a valid store slug but no products.
        # For this, use a unique store slug that is not used, or create & delete products.
        # Here, we'll just pick a unique slug that should have no products.
        empty_store_slug = "empty-store-tc003"
        params = {"storeSlug": empty_store_slug}
        resp = requests.get(list_url, params=params, auth=AUTH, timeout=TIMEOUT)
        resp.raise_for_status()
        products = resp.json()
        assert isinstance(products, list), "Response for empty product store should be a list"
        assert len(products) == 0, "No products should be returned for store with no products"

    finally:
        if product_id:
            delete_product(product_id)

test_list_products_by_store_slug()
