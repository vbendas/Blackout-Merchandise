"""API models for color separation service."""

from typing import List, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum


class SeparationMethod(str, Enum):
    """Halftone method to use."""
    ORDERED = "ordered"
    FLOYD_STEINBERG = "floyd_steinberg"
    CIRCULAR = "circular"


class SeparationRequest(BaseModel):
    """Request model for color separation."""
    image_url: str = Field(..., description="URL of the image to process")
    garment_color: Optional[str] = Field(
        None, 
        description="Hex color of garment (e.g., '#1A1A1A' for black)"
    )
    max_colors: int = Field(
        6, 
        ge=1, 
        le=8, 
        description="Maximum number of colors to extract"
    )
    similarity_threshold: float = Field(
        35.0,
        ge=0,
        le=100,
        description="Threshold for filtering colors similar to garment"
    )
    include_halftone: bool = Field(
        True,
        description="Apply halftone processing to layers"
    )
    output_resolutions: Optional[List[int]] = Field(
        None,
        description="Output DPI values (default: [72, 300])"
    )


class BatchSeparationRequest(BaseModel):
    """Request model for batch color separation."""
    image_urls: List[str] = Field(..., description="List of image URLs to process")
    garment_color: Optional[str] = Field(None, description="Garment color for all images")
    max_colors: int = Field(6, ge=1, le=8)
    similarity_threshold: float = Field(35.0, ge=0, le=100)
    include_halftone: bool = True


class ColorClusterResponse(BaseModel):
    """Color cluster information."""
    rgb: List[int]
    hex: str
    coverage: float
    pixel_count: int


class PantoneMappingResponse(BaseModel):
    """Pantone mapping information."""
    original_color: dict
    best_match: dict
    alternatives: List[dict]
    magna_recipe: Optional[dict] = None


class SeparationLayerResponse(BaseModel):
    """Separation layer information."""
    layer: Union[int, str]
    filename: str
    path: str
    original_color: Optional[str] = None
    rgb: Optional[List[int]] = None
    coverage: Optional[float] = None


class SeparationResponse(BaseModel):
    """Response model for color separation."""
    success: bool
    original_colors: List[ColorClusterResponse]
    filtered_colors: List[dict]
    kept_colors: int
    garment_reveal_coverage: float
    pantone_mappings: List[dict]
    separation_layers: List[SeparationLayerResponse]
    halftone_layers: Optional[dict] = None
    metadata: dict
    errors: List[str]


class BatchSeparationResponse(BaseModel):
    """Response model for batch separation."""
    total: int
    successful: int
    failed: int
    results: List[SeparationResponse]


class PantoneListResponse(BaseModel):
    """Response for listing Pantone colors."""
    total: int
    colors: List[dict]


class PantoneMapRequest(BaseModel):
    """Request to map a custom color to Pantone."""
    rgb: Optional[List[int]] = None
    hex: Optional[str] = None
    top_n: int = Field(5, ge=1, le=10)


class PantoneMapResponse(BaseModel):
    """Response for Pantone mapping."""
    input_color: dict
    matches: List[dict]
