import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@blackoutmerch.example", "REDACTED")
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_handle_stripe_webhook_events():
    # Test valid checkout.session.completed event processing
    valid_event_payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1234567890",
                "amount_total": 5000,
                "customer": "cus_test_123",
                "metadata": {
                    "artistId": "artist_test_123"
                }
            }
        }
    }
    response = requests.post(
        f"{BASE_URL}/stripe",
        json=valid_event_payload,
        headers=HEADERS,
        auth=AUTH,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Expected 200 OK for valid event, got {response.status_code}"

    # Test invalid event with missing signature (simulate signature verification failure)
    invalid_event_payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_0987654321",
                "amount_total": 3000,
                "customer": "cus_test_456",
                "metadata": {
                    "artistId": "artist_test_456"
                }
            }
        }
    }
    # Simulate missing required header or bad signature by omitting auth headers or channel signature
    # Since the PRD mentions 400 for missing signature or verification fail, we simulate by sending no auth or headers
    response_invalid = requests.post(
        f"{BASE_URL}/stripe",
        json=invalid_event_payload,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert response_invalid.status_code == 400 or response_invalid.status_code == 401, (
        f"Expected 400 or 401 for signature verification failure, got {response_invalid.status_code}"
    )

test_handle_stripe_webhook_events()