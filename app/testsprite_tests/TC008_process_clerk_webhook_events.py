import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("vbendas@merchfrom.com", "REDACTED")
HEADERS = {
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_process_clerk_webhook_events():
    url = f"{BASE_URL}/clerk"

    # Wrapped user.created event payload
    user_created_payload = {
        "type": "user.created",
        "data": {
            "object": {
                "id": "user_12345_created",
                "email": "created@example.com",
                "full_name": "Created User",
                "image_url": "http://example.com/created.png",
                "public_metadata": {
                    "role": "artist"
                }
            }
        }
    }

    # Wrapped user.updated event payload
    user_updated_payload = {
        "type": "user.updated",
        "data": {
            "object": {
                "id": "user_12345_updated",
                "email": "updated@example.com",
                "full_name": "Updated User",
                "image_url": "http://example.com/updated.png",
                "public_metadata": {
                    "role": "customer"
                }
            }
        }
    }

    # Invalid payloads (some with bad structure and some with bad data)
    invalid_payloads = [
        # Missing type field
        {
            "data": {
                "object": {
                    "id": "user_invalid_1",
                    "email": "invalid1@example.com",
                    "full_name": "Invalid User 1",
                    "public_metadata": {
                        "role": "admin"
                    }
                }
            }
        },
        # Invalid event type
        {
            "type": "unknown.event",
            "data": {
                "object": {
                    "id": "user_invalid_2",
                    "email": "invalid2@example.com",
                    "full_name": "Invalid User 2",
                    "public_metadata": {
                        "role": "artist"
                    }
                }
            }
        },
        # Missing required user data fields
        {
            "type": "user.created",
            "data": {
                "object": {
                    "image_url": "http://example.com/missingfields.png",
                    "public_metadata": {
                        "role": "admin"
                    }
                }
            }
        },
        # Malformed JSON structure (string instead of dict)
        "this is not a json object"
    ]

    def post_clerk(payload):
        try:
            if isinstance(payload, str):
                resp = requests.post(url, headers=HEADERS, data=payload, auth=AUTH, timeout=TIMEOUT)
            else:
                resp = requests.post(url, headers=HEADERS, json=payload, auth=AUTH, timeout=TIMEOUT)
            return resp
        except requests.RequestException as e:
            assert False, f"Request failed: {e}"

    # Test valid user.created event
    response = post_clerk(user_created_payload)
    assert response.status_code == 200, f"user.created event failed: {response.text}"

    # Test valid user.updated event
    response = post_clerk(user_updated_payload)
    assert response.status_code == 200, f"user.updated event failed: {response.text}"

    # Test invalid payloads result in 400
    for invalid_payload in invalid_payloads:
        response = post_clerk(invalid_payload)
        assert response.status_code == 400, f"Invalid payload should return 400 but returned {response.status_code}: {response.text}"


test_process_clerk_webhook_events()