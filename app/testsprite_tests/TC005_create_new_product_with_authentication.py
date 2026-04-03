import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_create_new_product_with_authentication():
    auth = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
    product_data = {
        "storeSlug": "test-store-slug",
        "name": "Test Product",
        "description": "A product created for test case TC005",
        "baseCost": 10.0,
        "retailPrice": 20.0,
        "mockupUrl": "http://example.com/mockup.jpg"
    }
    
    created_product_id = None
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Attempt to create product without auth and expect 401 Unauthorized
        response_unauth = requests.post(
            f"{BASE_URL}/products/create",
            json=product_data,
            headers=headers,
            timeout=TIMEOUT
        )
        assert response_unauth.status_code == 401

        # Create product with authentication
        response = requests.post(
            f"{BASE_URL}/products/create",
            json=product_data,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT
        )
        assert response.status_code == 200
        json_response = response.json()
        # According to PRD, the response should be the product ID as a string
        assert isinstance(json_response, str)
        created_product_id = json_response
        assert created_product_id != ""

        # Verify the product can be retrieved by the returned ID (optional validation)
        get_response = requests.get(
            f"{BASE_URL}/products/getById",
            params={"productId": created_product_id},
            timeout=TIMEOUT
        )
        assert get_response.status_code == 200
        product_info = get_response.json()
        assert product_info is not None
        assert product_info.get("name") == product_data["name"]
        assert product_info.get("description") == product_data["description"]
        assert product_info.get("baseCost") == product_data["baseCost"]
        assert product_info.get("retailPrice") == product_data["retailPrice"]
        assert product_info.get("mockupUrl") == product_data["mockupUrl"]

    finally:
        pass


test_create_new_product_with_authentication()