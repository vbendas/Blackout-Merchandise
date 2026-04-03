"""
API Routes for Color Separation Service
"""

import os
import uuid
import tempfile
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

from src.api.models import (
    SeparationRequest,
    SeparationResponse,
    BatchSeparationRequest,
    BatchSeparationResponse,
    PantoneListResponse,
    PantoneMapRequest,
    PantoneMapResponse,
)
from src.spot_color_separator import SpotColorSeparator, SeparationConfig

app = FastAPI(
    title="Merch From - Spot Color Separation API",
    description="AI-powered spot color separation for screen printing with Magna HB inks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/tmp/color-separations")

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


async def download_image(url: str, output_dir: Path) -> Path:
    """Download image from URL to local file."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        
        suffix = Path(url).suffix or ".png"
        filename = f"{uuid.uuid4()}{suffix}"
        filepath = output_dir / filename
        
        filepath.write_bytes(response.content)
        
        return filepath


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Merch From - Spot Color Separation",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/separate", response_model=SeparationResponse)
async def separate_colors(request: SeparationRequest, background_tasks: BackgroundTasks):
    """
    Perform spot color separation on an image.
    
    Extracts dominant colors, maps to Pantone, filters based on garment color,
    and creates separation layers with optional halftone processing.
    """
    try:
        session_id = str(uuid.uuid4())
        output_dir = Path(OUTPUT_DIR) / session_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Downloading image from {request.image_url}")
        image_path = await download_image(request.image_url, output_dir)
        
        config = SeparationConfig(
            max_colors=request.max_colors,
            similarity_threshold=request.similarity_threshold,
            garment_color=request.garment_color,
            include_halftone=request.include_halftone,
            output_resolutions=request.output_resolutions,
        )
        
        separator = SpotColorSeparator(config)
        
        result = separator.separate(
            image_path=str(image_path),
            garment_color=request.garment_color,
            output_dir=str(output_dir),
        )
        
        response = SeparationResponse(
            success=result.success,
            original_colors=result.original_colors,
            filtered_colors=result.filtered_colors,
            kept_colors=result.kept_colors,
            garment_reveal_coverage=result.garment_reveal_coverage,
            pantone_mappings=result.pantone_mappings,
            separation_layers=result.separation_layers,
            halftone_layers=result.halftone_layers,
            metadata=result.metadata,
            errors=result.errors,
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/separate-batch", response_model=BatchSeparationResponse)
async def batch_separate_colors(request: BatchSeparationRequest):
    """
    Perform batch color separation on multiple images.
    """
    try:
        session_id = str(uuid.uuid4())
        output_dir = Path(OUTPUT_DIR) / session_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        config = SeparationConfig(
            max_colors=request.max_colors,
            similarity_threshold=request.similarity_threshold,
            garment_color=request.garment_color,
            include_halftone=True,
        )
        
        separator = SpotColorSeparator(config)
        
        results = []
        successful = 0
        failed = 0
        
        for image_url in request.image_urls:
            try:
                image_path = await download_image(image_url, output_dir)
                
                result = separator.separate(
                    image_path=str(image_path),
                    garment_color=request.garment_color,
                    output_dir=str(output_dir / Path(image_url).stem),
                )
                
                if result.success:
                    successful += 1
                else:
                    failed += 1
                    
                results.append(SeparationResponse(
                    success=result.success,
                    original_colors=result.original_colors,
                    filtered_colors=result.filtered_colors,
                    kept_colors=result.kept_colors,
                    garment_reveal_coverage=result.garment_reveal_coverage,
                    pantone_mappings=result.pantone_mappings,
                    separation_layers=result.separation_layers,
                    halftone_layers=result.halftone_layers,
                    metadata=result.metadata,
                    errors=result.errors,
                ))
                
            except Exception as e:
                failed += 1
                results.append(SeparationResponse(
                    success=False,
                    original_colors=[],
                    filtered_colors=[],
                    kept_colors=0,
                    garment_reveal_coverage=0,
                    pantone_mappings=[],
                    separation_layers=[],
                    halftone_layers=None,
                    metadata={},
                    errors=[str(e)],
                ))
        
        return BatchSeparationResponse(
            total=len(request.image_urls),
            successful=successful,
            failed=failed,
            results=results,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/colors", response_model=PantoneListResponse)
async def list_pantone_colors(category: str = None):
    """
    List available Pantone colors.
    
    Optionally filter by category (red, blue, green, yellow, etc.)
    """
    from src.color_matching import ColorMatchingEngine
    
    matcher = ColorMatchingEngine()
    
    if category:
        colors = matcher.get_colors_by_category(category.lower())
    else:
        colors = matcher.pantone_colors
    
    return PantoneListResponse(
        total=len(colors),
        colors=[
            {
                "name": c.name,
                "pantone": c.pantone,
                "hex": c.hex,
                "rgb": c.rgb,
                "category": c.category,
                "magna_base": c.magna_base,
                "magna_pigment": c.magna_pigment,
            }
            for c in colors
        ],
    )


@app.post("/map-pantone", response_model=PantoneMapResponse)
async def map_to_pantone(request: PantoneMapRequest):
    """
    Map a custom color to nearest Pantone colors.
    
    Provide either RGB [r, g, b] or hex color code.
    """
    from src.color_matching import ColorMatchingEngine
    
    matcher = ColorMatchingEngine()
    
    if request.hex:
        hex_color = request.hex.lstrip('#')
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    elif request.rgb:
        rgb = tuple(request.rgb)
    else:
        raise HTTPException(status_code=400, detail="Provide either rgb or hex")
    
    matches = matcher.find_closest_pantone(rgb, top_n=request.top_n)
    
    return PantoneMapResponse(
        input_color={"rgb": list(rgb), "hex": f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"},
        matches=[m.to_dict() for m in matches],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
