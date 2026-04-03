"""
API Routes for Mockup Generation Service
"""

import time
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status
import structlog

from src.api.models import (
    GenerateMockupRequest,
    GenerateMockupResponse,
    BatchMockupRequest,
    BatchMockupResponse,
    BatchMockupResult,
    TemplatesResponse,
    TemplateInfo,
    MockupView
)
from src.mockup_service import MockupGenerationService

router = APIRouter(prefix="/mockups", tags=["Mockups"])
logger = structlog.get_logger()

# Initialize service
mockup_service = MockupGenerationService()


@router.post(
    "/generate",
    response_model=GenerateMockupResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a single product mockup",
    description="Generate realistic product mockups with halftone effects for a design"
)
async def generate_mockup(request: GenerateMockupRequest):
    """
    Generate mockups for a single design
    
    - **design_url**: URL to the design image (PNG/JPG)
    - **product_sku**: Stanley Stella product SKU
    - **views**: List of views to generate (flat, worn, closeup)
    - **placement**: Where to place the design on the product
    - **fabric_type**: Type of fabric for texture overlay
    
    Returns URLs to high-res (300 DPI) and web-res (72 DPI) mockups
    """
    try:
        result = await mockup_service.generate_mockup(request)
        return GenerateMockupResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("generate_mockup_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate mockup: {str(e)}"
        )


@router.post(
    "/generate-batch",
    response_model=BatchMockupResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate multiple mockups in batch",
    description="Generate mockups for multiple designs in parallel"
)
async def generate_batch_mockups(request: BatchMockupRequest):
    """
    Generate mockups for multiple designs in batch
    
    - Maximum 50 designs per batch
    - Processes designs in parallel
    - Returns results for all designs (success or failure)
    """
    start_time = time.time()
    batch_id = f"batch_{uuid.uuid4().hex[:12]}"
    
    logger.info(
        "generate_batch_start",
        batch_id=batch_id,
        total=len(request.designs)
    )
    
    results: List[BatchMockupResult] = []
    completed = 0
    failed = 0
    
    # Process each design
    for idx, design_req in enumerate(request.designs):
        try:
            result = await mockup_service.generate_mockup(design_req)
            results.append(BatchMockupResult(
                index=idx,
                success=True,
                mockup=GenerateMockupResponse(**result)
            ))
            completed += 1
        except Exception as e:
            results.append(BatchMockupResult(
                index=idx,
                success=False,
                error=str(e)
            ))
            failed += 1
    
    processing_time = int((time.time() - start_time) * 1000)
    
    logger.info(
        "generate_batch_complete",
        batch_id=batch_id,
        completed=completed,
        failed=failed,
        processing_time_ms=processing_time
    )
    
    return BatchMockupResponse(
        success=True,
        batch_id=batch_id,
        total=len(request.designs),
        completed=completed,
        failed=failed,
        results=results,
        processing_time_ms=processing_time
    )


@router.get(
    "/templates",
    response_model=TemplatesResponse,
    status_code=status.HTTP_200_OK,
    summary="List available product templates",
    description="Get list of all available Stanley Stella product templates"
)
async def list_templates():
    """
    List all available product templates
    
    Returns information about each product including:
    - SKU
    - Name and category
    - Available views
    - Supported placements
    """
    try:
        templates_data = mockup_service.get_templates()
        
        templates = [
            TemplateInfo(
                sku=t["sku"],
                name=t["name"],
                category=t["category"],
                available_views=t.get("available_views", ["flat"]),
                available_placements=["front_chest", "back_full"],  # Default
                fabric_types=t.get("fabric_types", ["cotton"]),
                thumbnail_url=t.get("thumbnail_url")
            )
            for t in templates_data
        ]
        
        return TemplatesResponse(
            success=True,
            templates=templates,
            total=len(templates)
        )
        
    except Exception as e:
        logger.error("list_templates_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}"
        )


@router.get(
    "/templates/{sku}",
    response_model=TemplateInfo,
    status_code=status.HTTP_200_OK,
    summary="Get specific product template",
    description="Get detailed information about a specific Stanley Stella product"
)
async def get_template(sku: str):
    """
    Get detailed information about a specific product template
    """
    try:
        template_data = mockup_service.get_template_by_sku(sku)
        
        if not template_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with SKU {sku} not found"
            )
        
        return TemplateInfo(
            sku=template_data["sku"],
            name=template_data["name"],
            category=template_data["category"],
            available_views=template_data.get("available_views", ["flat"]),
            available_placements=template_data.get("available_placements", ["front_chest"]),
            fabric_types=template_data.get("fabric_types", ["cotton"]),
            thumbnail_url=template_data.get("thumbnail_url")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_template_error", error=str(e), sku=sku)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}"
        )
