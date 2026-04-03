import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
TIMEOUT = 30

def test_get_product_by_id():
    # Helper to create a new product for testing
    def create_product():
        url = f"{BASE_URL}/products/create"
        payload = {
            "storeSlug": "test-store-slug",
            "name": "Test Product",
            "description": "Test product description",
            "baseCost": 10.0,
            "retailPrice": 20.0,
            "mockupUrl": "https://example.com/mockup.png"
        }
        response = requests.post(url, json=payload, auth=AUTH, timeout=TIMEOUT)
        response.raise_for_status()
        product_id = response.json()
        assert isinstance(product_id, str) and product_id != ""
        return product_id

    # Helper to delete a product by ID (if such endpoint existed)
    # Since no delete endpoint mentioned in PRD, skip actual deletion
    # We'll just clean up logically if needed

    # Create product to have valid product ID
    product_id = None
    try:
        product_id = create_product()

        # Test valid productId retrieval
        get_url = f"{BASE_URL}/products/getById"
        params = {"productId": product_id}
        resp = requests.get(get_url, params=params, auth=AUTH, timeout=TIMEOUT)
        assert resp.status_code == 200
        product = resp.json()
        assert product is not None and isinstance(product, dict)
        assert product.get("name") == "Test Product"
        assert product.get("description") == "Test product description"

        # Test invalid productId format (e.g. empty string)
        invalid_params = {"productId": ""}
        resp_invalid = requests.get(get_url, params=invalid_params, auth=AUTH, timeout=TIMEOUT)
        # Server might respond 200 with null or 400; accept 400 or 200 with null
        assert resp_invalid.status_code in (200, 400)
        if resp_invalid.status_code == 200:
            assert resp_invalid.json() is None

        # Test non-existent productId (random UUID-like string)
        non_existent_id = "nonexistentproductid1234567890"
        non_exist_params = {"productId": non_existent_id}
        resp_non_exist = requests.get(get_url, params=non_exist_params, auth=AUTH, timeout=TIMEOUT)
        assert resp_non_exist.status_code == 200
        non_exist_product = resp_non_exist.json()
        assert non_exist_product is None

    finally:
        # No delete endpoint given, so cannot cleanup
        pass

test_get_product_by_id()