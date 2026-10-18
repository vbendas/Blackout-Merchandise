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

from src.spot_color_separator import SpotColorSeparator, SeparationConfig, PrintMethod, ColorMode

app = FastAPI(
    title="Blackout Merchandise Color Separation API",
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
    return {"message": "Blackout Merchandise Color Separation API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/separate")
async def separate_colors(
    image: UploadFile = File(...),
    garment_color: str = "#FFFFFF",
    max_colors: int = 6,
    threshold: float = 35.0,
    color_mode: str = "spot",
    print_method: str = "screen",
    choke_px: int = 2,
    trap_px: int = 1,
    skip_white_base: bool = False,
    include_halftone: bool = True
):
    """
    Separate colors from an image for print production.
    
    Args:
        image: Design image file
        garment_color: Hex color of garment (e.g., #1A1A1A)
        max_colors: Max spot colors to extract (1-8)
        threshold: Color similarity threshold
        color_mode: "spot" (screen print) or "process" (DTG/DTF)
        print_method: "screen", "dtg", or "dtf"
        choke_px: White base choke in pixels (screen-only)
        trap_px: Color trapping radius in pixels (screen-only)
        skip_white_base: Skip white base generation
        include_halftone: Apply halftone processing
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            content = await image.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Validate and convert enums
        try:
            mode = ColorMode(color_mode.lower())
            method = PrintMethod(print_method.lower())
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Invalid color_mode='{color_mode}' or print_method='{print_method}'"
                }
            )

        config = SeparationConfig(
            max_colors=max_colors,
            similarity_threshold=threshold,
            color_mode=mode,
            print_method=method,
            choke_px=choke_px,
            trap_px=trap_px,
            skip_white_base=skip_white_base,
            include_halftone=include_halftone
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

        # Build layer response
        layers = []
        for layer in result.separation_layers:
            layer_dict = {
                "layer": layer.get("layer"),
                "filename": layer.get("filename"),
                "path": layer.get("path"),
                "type": layer.get("type", "spot")
            }
            # Add optional fields if present
            if "original_color" in layer:
                layer_dict["original_color"] = layer["original_color"]
            if "rgb" in layer:
                layer_dict["rgb"] = layer["rgb"]
            if "coverage" in layer:
                layer_dict["coverage"] = layer["coverage"]
            if "channel" in layer:
                layer_dict["channel"] = layer["channel"]
            layers.append(layer_dict)

        # Build white base response
        white_base_response = None
        if result.white_base_layer:
            wbl = result.white_base_layer
            white_base_response = {
                "layer": wbl.get("layer"),
                "filename": wbl.get("filename"),
                "path": wbl.get("path"),
                "choke_applied": wbl.get("choke_applied"),
                "choke_px": wbl.get("choke_px"),
                "original_area": wbl.get("original_area"),
                "choked_area": wbl.get("choked_area"),
                "area_reduction_percent": wbl.get("area_reduction")
            }

        return {
            "success": True,
            "color_mode": color_mode,
            "print_method": print_method,
            "original_colors": [
                {
                    "rgb": c.get("rgb"),
                    "hex": c.get("hex"),
                    "coverage": c.get("coverage"),
                    "pixel_count": c.get("pixel_count")
                }
                for c in result.original_colors
            ],
            "filtered_colors": result.filtered_colors,
            "kept_colors": result.kept_colors,
            "garment_reveal_coverage": result.garment_reveal_coverage,
            "pantone_mappings": result.pantone_mappings,
            "white_base_layer": white_base_response,
            "layers": layers,
            "halftone_layers": result.halftone_layers,
            "metadata": {
                "processing_time_seconds": result.metadata.get("processing_time_seconds"),
                "timestamp": result.metadata.get("timestamp"),
                "config": result.metadata.get("config", {})
            },
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
