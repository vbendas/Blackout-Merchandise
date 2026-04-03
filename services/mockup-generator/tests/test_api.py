"""
Tests for Mockup Generation Service
"""

import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


class TestHealth:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test health endpoint returns 200"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "mockup-generator"
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "docs" in data


class TestMockupGeneration:
    """Mockup generation endpoint tests"""
    
    def test_generate_mockup_success(self):
        """Test successful mockup generation"""
        payload = {
            "design_url": "https://example.com/design.png",
            "product_sku": "STTU755_CREATOR_BLACK",
            "views": ["flat", "worn"],
            "placement": "front_chest",
            "fabric_type": "cotton"
        }
        
        response = client.post("/api/v1/mockups/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "mockup_id" in data
        assert "views" in data
    
    def test_generate_mockup_invalid_url(self):
        """Test mockup generation with invalid URL"""
        payload = {
            "design_url": "not-a-valid-url",
            "product_sku": "STTU755_CREATOR_BLACK"
        }
        
        response = client.post("/api/v1/mockups/generate", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_generate_batch_mockups(self):
        """Test batch mockup generation"""
        payload = {
            "designs": [
                {
                    "design_url": "https://example.com/design1.png",
                    "product_sku": "STTU755_CREATOR_BLACK",
                    "views": ["flat"]
                }
            ]
        }
        
        response = client.post("/api/v1/mockups/generate-batch", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 1


class TestTemplates:
    """Template endpoint tests"""
    
    def test_list_templates(self):
        """Test listing available templates"""
        response = client.get("/api/v1/mockups/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "templates" in data
        assert isinstance(data["templates"], list)
