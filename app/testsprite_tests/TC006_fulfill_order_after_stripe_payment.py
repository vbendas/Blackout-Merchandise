import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
TIMEOUT = 30

def test_fulfill_order_after_stripe_payment():
    # We need a product and artist setup to simulate an order
    product_payload = {
        "storeSlug": "test-store-fulfill",
        "name": "Test Product Fulfill Order",
        "description": "A product to test order fulfillment.",
        "baseCost": 10.0,
        "retailPrice": 20.0,
        "mockupUrl": "http://example.com/mockup.jpg"
    }
    created_product_id = None
    try:
        # Create product to simulate an order for
        response_create_product = requests.post(
            f"{BASE_URL}/products/create",
            json=product_payload,
            auth=AUTH,
            timeout=TIMEOUT
        )
        assert response_create_product.status_code == 200, f"Create product failed: {response_create_product.text}"
        created_product_id = response_create_product.json()
        assert isinstance(created_product_id, str) and created_product_id.strip() != "", "Invalid product ID returned"

        # To test fulfillOrder internal mutation we simulate a Stripe payment success
        # The endpoint is internal but accessible via POST to /orders/fulfillOrder per spec
        fulfill_payload = {
            "stripeSessionId": "cs_test_1234567890",
            "amount": 2000,  # amount in smallest currency unit (e.g. cents)
            "customerId": "cust_12345",
            "artistId": "artist_12345"
        }

        response_fulfill = requests.post(
            f"{BASE_URL}/orders/fulfillOrder",
            json=fulfill_payload,
            auth=AUTH,
            timeout=TIMEOUT
        )
        assert response_fulfill.status_code == 200, f"Fulfill order failed: {response_fulfill.text}"
        # Response content not specified; assume JSON object with order info or empty
        # Just ensure content is JSON and not error
        try:
            data = response_fulfill.json()
        except Exception:
            # If no JSON, still okay for 200; skip strict validation here
            data = None

        # Perform at least basic validation of response content type
        content_type = response_fulfill.headers.get("Content-Type", "")
        assert "application/json" in content_type or data is None, "Invalid content-type returned"

    finally:
        # Clean up created product if possible
        # No DELETE endpoint specified in PRD, so skipping deletion as not supported
        pass

test_fulfill_order_after_stripe_payment()