import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import uuid
from pathlib import Path as PathLib
from typing import List, Optional

from src.spot_color_separator import SpotColorSeparator, SeparationConfig

app = FastAPI(
    title="Merch From Color Separation API",
    description="Spot color separation service for screen printing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

separator = SpotColorSeparator()

@app.get("/")
async def root():
    return {"message": "Merch From Color Separation API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/separate")
async def separate_colors(
    image: UploadFile = File(...),
    garment_color: str = "#FFFFFF",
    max_colors: int = 6,
    threshold: float = 35.0,
    include_white: bool = True
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            content = await image.read()
            tmp.write(content)
            tmp_path = tmp.name

        config = SeparationConfig(
            max_colors=max_colors,
            similarity_threshold=threshold
        )
        
        sep = SpotColorSeparator(config=config)
        result = sep.separate(
            image_path=tmp_path,
            garment_color=garment_color
        )

        os.unlink(tmp_path)

        if not result.success:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": result.errors}
            )

        layers = []
        for layer in result.separation_layers:
            layers.append({
                "layer": layer.layer,
                "filename": layer.filename,
                "path": layer.path,
                "original_color": layer.original_color,
                "rgb": layer.rgb,
                "coverage": layer.coverage
            })

        return {
            "success": True,
            "original_colors": [
                {
                    "rgb": c.rgb,
                    "hex": c.hex,
                    "coverage": c.coverage,
                    "pixel_count": c.pixel_count
                }
                for c in result.original_colors
            ],
            "filtered_colors": result.filtered_colors,
            "kept_colors": result.kept_colors,
            "garment_reveal_coverage": result.garment_reveal_coverage,
            "pantone_mappings": result.pantone_mappings,
            "layers": layers,
            "halftone_layers": result.halftone_layers,
            "metadata": result.metadata,
            "errors": result.errors
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/cluster")
async def cluster_colors(
    image: UploadFile = File(...),
    max_colors: int = 6
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            content = await image.read()
            tmp.write(content)
            tmp_path = tmp.name

        from src.color_clustering import ColorClusteringEngine
        clusterer = ColorClusteringEngine(max_clusters=max_colors)
        colors = clusterer.extract_colors(tmp_path, max_colors)

        os.unlink(tmp_path)

        return {
            "success": True,
            "clusters": [
                {
                    "rgb": c.rgb,
                    "hex": c.hex,
                    "percentage": c.percentage,
                    "pixel_count": c.pixel_count
                }
                for c in colors
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/pantone")
async def get_pantone_colors():
    try:
        from src.color_matching import ColorMatchingEngine
        matcher = ColorMatchingEngine()
        return {
            "success": True,
            "colors": [c.to_dict() for c in matcher.pantone_colors]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/map-color")
async def map_color_to_pantone(rgb: Optional[List[int]] = None, hex: Optional[str] = None):
    try:
        from src.color_matching import ColorMatchingEngine
        from src.color_clustering import ColorClusteringEngine
        matcher = ColorMatchingEngine()
        clusterer = ColorClusteringEngine(max_clusters=1)
        
        if rgb:
            rgb_tuple = tuple(rgb)
            matches = matcher.find_closest_pantone(rgb_tuple, top_n=5)
        elif hex:
            rgb_tuple = clusterer.hex_to_rgb(hex)
            matches = matcher.find_closest_pantone(rgb_tuple, top_n=5)
        else:
            raise HTTPException(status_code=400, detail="Provide either rgb or hex")
        
        return {
            "success": True,
            "input": {"rgb": rgb, "hex": hex},
            "matches": [m.to_dict() for m in matches]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
