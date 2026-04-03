import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
TIMEOUT = 30


def test_create_stripe_checkout_session():
    # Prepare a fake product by creating it to get a product ID
    created_product_id = None
    try:
        # Create product to obtain productId
        product_payload = {
            "storeSlug": "artist-test-store",
            "name": "Test Product",
            "description": "Test Description",
            "baseCost": 10.0,
            "retailPrice": 20.0,
            "mockupUrl": "http://example.com/mockup.png"
        }
        create_product_resp = requests.post(
            f"{BASE_URL}/products/create",
            json=product_payload,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        assert create_product_resp.status_code == 200, "Failed to create product for test setup"
        created_product_id = create_product_resp.json()
        assert isinstance(created_product_id, str) and created_product_id, "Invalid product ID returned"

        # Use dummy artistId and priceId (Stripe Price ID) as strings
        price_id = f"price_{created_product_id}"
        artist_id = "artist_test_clerk_id"

        # Call the createCheckoutSession endpoint
        session_payload = {"priceId": price_id, "artistId": artist_id}
        resp = requests.post(
            f"{BASE_URL}/stripe/createCheckoutSession",
            json=session_payload,
            auth=AUTH,
            timeout=TIMEOUT,
        )

        # Validate response
        if resp.status_code == 200:
            # Expected success: response contains checkout session URL as text or JSON key
            session_url = None
            try:
                data = resp.json()
                if isinstance(data, dict):
                    session_url = data.get("url") or data.get("checkoutUrl") or data.get("checkout_session_url")
            except Exception:
                session_url = resp.text.strip()

            assert session_url and isinstance(session_url, str) and session_url.startswith("http"), \
                "Response missing valid checkout session URL"
        elif resp.status_code == 401:
            # Unauthorized: authentication required - test passes if authentication fails without auth
            assert False, "Authentication required but request authenticated - unexpected 401"
        else:
            assert False, f"Unexpected response status code: {resp.status_code} - {resp.text}"

    finally:
        # Cleanup: attempt to delete the created product if endpoint exists (not in PRD so skipped)
        pass


test_create_stripe_checkout_session()
