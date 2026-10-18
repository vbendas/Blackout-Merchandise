"""
Print Engine - FastAPI Service for Image Processing
Handles color separation and halftone generation for screen printing preview
"""

import base64
import io
import time
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from color_separator import KMeansColorSeparator, SeparatedLayer
from halftone_generator import HalftoneGenerator
from preview_compositor import PreviewCompositor

app = FastAPI(
    title="Blackout Merchandise Print Engine",
    description="Image processing service for screen printing preview",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LayerResponse(BaseModel):
    colorHex: str
    colorName: str
    pantone: str
    imageBase64: str


class ProcessDesignResponse(BaseModel):
    layers: List[LayerResponse]
    compositePreview: str
    processingTimeMs: int
    colorsDetected: int


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "print-engine"}


@app.post("/api/v1/process-design", response_model=ProcessDesignResponse)
async def process_design(
    file: UploadFile = File(...),
    target_colors: Optional[str] = Form(None),  # JSON string of hex colors
    lpi: int = Form(55),
    max_colors: int = Form(6),
    preview_size: int = Form(800),
):
    """
    Process a design image for screen printing preview.

    Steps:
    1. Color separation using k-means clustering
    2. Halftone generation per separated color
    3. Composite preview generation

    Returns separated layers and a composite WebP preview.
    """
    start_time = time.time()

    try:
        # Read uploaded file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Parse target colors if provided
        target_colors_list = None
        if target_colors:
            import json

            try:
                target_colors_list = json.loads(target_colors)
            except:
                pass

        # Step 1: Color separation
        separator = KMeansColorSeparator()
        separated_layers = separator.separate(image, max_colors, target_colors_list)

        # Step 2: Halftone generation
        halftone_gen = HalftoneGenerator()
        halftoned_layers = []

        for i, layer in enumerate(separated_layers):
            halftoned = halftone_gen.generate_halftone(
                layer.mask, lpi=lpi, angle_index=i, dpi=300
            )
            halftoned_layers.append((layer, halftoned))

        # Step 3: Composite preview
        compositor = PreviewCompositor()
        composite_image = compositor.composite_preview(
            halftoned_layers, preview_size=preview_size, background_color="#FFFFFF"
        )

        # Encode composite as base64 WebP
        composite_buffer = io.BytesIO()
        composite_image.save(composite_buffer, format="WEBP", quality=85)
        composite_base64 = base64.b64encode(composite_buffer.getvalue()).decode("utf-8")

        # Encode individual layers
        layer_responses = []
        for layer, halftoned in halftoned_layers:
            # Convert halftoned mask to RGBA
            layer_rgba = np.zeros((*halftoned.shape, 4), dtype=np.uint8)
            layer_rgba[halftoned > 0] = [
                int(layer.color_hex[1:3], 16),
                int(layer.color_hex[3:5], 16),
                int(layer.color_hex[5:7], 16),
                255,
            ]

            layer_pil = compositor.numpy_to_pil(layer_rgba)
            layer_buffer = io.BytesIO()
            layer_pil.save(layer_buffer, format="WEBP", quality=85)
            layer_base64 = base64.b64encode(layer_buffer.getvalue()).decode("utf-8")

            layer_responses.append(
                LayerResponse(
                    colorHex=layer.color_hex,
                    colorName=layer.color_name,
                    pantone=layer.pantone,
                    imageBase64=layer_base64,
                )
            )

        processing_time = int((time.time() - start_time) * 1000)

        return ProcessDesignResponse(
            layers=layer_responses,
            compositePreview=f"data:image/webp;base64,{composite_base64}",
            processingTimeMs=processing_time,
            colorsDetected=len(separated_layers),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
