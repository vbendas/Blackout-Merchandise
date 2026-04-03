"""
Pydantic models for API requests and responses
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class ViewType(str, Enum):
    """Available mockup view types"""
    FLAT = "flat"
    WORN = "worn"
    CLOSEUP = "closeup"


class Placement(str, Enum):
    """Available design placements"""
    FRONT_CHEST = "front_chest"
    BACK_FULL = "back_full"
    LEFT_SLEEVE = "left_sleeve"
    RIGHT_SLEEVE = "right_sleeve"
    INTERNAL_NECKLINE = "internal_neckline"


class FabricType(str, Enum):
    """Available fabric types"""
    COTTON = "cotton"
    POLYESTER = "polyester"
    CANVAS = "canvas"
    TRI_BLEND = "tri_blend"


class GenerateMockupRequest(BaseModel):
    """Request model for single mockup generation"""
    design_url: HttpUrl = Field(..., description="URL to the design image")
    product_sku: str = Field(..., description="Product SKU (e.g., STTU755_CREATOR_BLACK)")
    views: List[ViewType] = Field(default=[ViewType.FLAT, ViewType.WORN], description="Views to generate")
    placement: Placement = Field(default=Placement.FRONT_CHEST, description="Design placement on product")
    fabric_type: FabricType = Field(default=FabricType.COTTON, description="Fabric type for texture overlay")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "design_url": "https://example.com/design.png",
                "product_sku": "STTU755_CREATOR_BLACK",
                "views": ["flat", "worn"],
                "placement": "front_chest",
                "fabric_type": "cotton"
            }
        }
    }


class MockupView(BaseModel):
    """Individual mockup view result"""
    view_type: ViewType
    high_res_url: str
    web_res_url: str
    width: int
    height: int


class GenerateMockupResponse(BaseModel):
    """Response model for mockup generation"""
    success: bool
    mockup_id: str
    product_sku: str
    views: List[MockupView]
    generated_at: datetime
    processing_time_ms: int
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "mockup_id": "mock_abc123",
                "product_sku": "STTU755_CREATOR_BLACK",
                "views": [
                    {
                        "view_type": "flat",
                        "high_res_url": "https://res.cloudinary.com/.../high_res.jpg",
                        "web_res_url": "https://res.cloudinary.com/.../web_res.webp",
                        "width": 3000,
                        "height": 4000
                    }
                ],
                "generated_at": "2026-03-15T10:30:00Z",
                "processing_time_ms": 2500
            }
        }
    }


class BatchMockupRequest(BaseModel):
    """Request model for batch mockup generation"""
    designs: List[GenerateMockupRequest] = Field(..., max_length=50, description="List of designs to process")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "designs": [
                    {
                        "design_url": "https://example.com/design1.png",
                        "product_sku": "STTU755_CREATOR_BLACK",
                        "views": ["flat"]
                    }
                ]
            }
        }
    }


class BatchMockupResult(BaseModel):
    """Individual result in batch processing"""
    index: int
    success: bool
    mockup: Optional[GenerateMockupResponse] = None
    error: Optional[str] = None


class BatchMockupResponse(BaseModel):
    """Response model for batch mockup generation"""
    success: bool
    batch_id: str
    total: int
    completed: int
    failed: int
    results: List[BatchMockupResult]
    processing_time_ms: int


class TemplateInfo(BaseModel):
    """Template information"""
    sku: str
    name: str
    category: str
    available_views: List[ViewType]
    available_placements: List[Placement]
    fabric_types: List[FabricType]
    thumbnail_url: Optional[str] = None


class TemplatesResponse(BaseModel):
    """Response model for templates list"""
    success: bool
    templates: List[TemplateInfo]
    total: int
