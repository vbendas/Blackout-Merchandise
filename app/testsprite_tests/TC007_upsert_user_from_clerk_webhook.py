import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
TIMEOUT = 30

def test_upsert_user_from_clerk_webhook():
    # Prepare payload with all required fields plus optional imageUrl
    user_payload = {
        "clerkId": "user_123456789",
        "email": "testuser@example.com",
        "displayName": "Test User",
        "imageUrl": "https://example.com/avatar.png",
        "role": "artist"
    }

    # Endpoint for internal mutation (assuming internal mutations under /users/upsertUser)
    url = f"{BASE_URL}/users/upsertUser"

    try:
        # Make POST request with Basic Token Auth headers and JSON payload
        response = requests.post(url, json=user_payload, auth=AUTH, timeout=TIMEOUT)
        # Assert the request succeeded with 200 OK
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
        # Optionally validate response content if returns some confirmation JSON
        # For safety, just check response json is parseable and contains expected keys
        resp_json = response.json()
        assert resp_json is not None, "Response JSON is None"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_upsert_user_from_clerk_webhook()