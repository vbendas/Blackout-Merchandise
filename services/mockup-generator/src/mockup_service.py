"""
Mockup Generation Service

High-level service that orchestrates the entire mockup generation pipeline
"""

import time
import uuid
from datetime import datetime
from typing import List, Optional

import httpx
import structlog
from PIL import Image
import io

from src.config import get_settings
from src.template_manager import TemplateManager
from src.texture_manager import TextureManager
from src.halftone_processor import HalftoneProcessor
from src.compositing_engine import CompositingEngine, BlendMode, ScaleMode
from src.storage.cloudinary_uploader import CloudinaryUploader
from src.api.models import GenerateMockupRequest, MockupView

logger = structlog.get_logger()


class MockupGenerationService:
    """
    High-level service for generating mockups
    
    Orchestrates:
    1. Design download
    2. Halftone processing
    3. Template loading
    4. Compositing
    5. Upload to Cloudinary
    """
    
    def __init__(self):
        """Initialize all components"""
        self.settings = get_settings()
        self.template_manager = TemplateManager(self.settings.templates_dir)
        self.texture_manager = TextureManager(self.settings.assets_dir + "/textures")
        self.halftone_processor = HalftoneProcessor()
        self.compositing_engine = CompositingEngine(self.texture_manager)
        self.uploader = CloudinaryUploader()
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def generate_mockup(
        self,
        request: GenerateMockupRequest
    ) -> dict:
        """
        Generate mockup from request
        
        Args:
            request: GenerateMockupRequest with design URL and parameters
        
        Returns:
            Dictionary with mockup data
        """
        start_time = time.time()
        mockup_id = f"mock_{uuid.uuid4().hex[:12]}"
        
        logger.info(
            "generate_mockup_start",
            mockup_id=mockup_id,
            product_sku=request.product_sku,
            views=[v.value for v in request.views]
        )
        
        try:
            # 1. Download design
            design = await self._download_design(str(request.design_url))
            
            # 2. Process halftone for dual resolution
            high_res_halftone, web_res_halftone = self.halftone_processor.create_dual_resolution(
                design,
                method="ordered"
            )
            
            views_result = []
            upload_tasks = []
            
            # 3. Generate each view
            for view in request.views:
                try:
                    # Load template
                    template = self.template_manager.load_template(
                        request.product_sku,
                        view.value
                    )
                    
                    # Generate high-res mockup
                    high_res_mockup = self.compositing_engine.composite(
                        high_res_halftone,
                        template,
                        blend_mode=BlendMode.MULTIPLY,
                        scale_mode=ScaleMode.FIT,
                        fabric_type=request.fabric_type.value
                    )
                    
                    # Generate web-res mockup
                    web_res_mockup = self.compositing_engine.composite(
                        web_res_halftone,
                        template,
                        blend_mode=BlendMode.MULTIPLY,
                        scale_mode=ScaleMode.FIT,
                        fabric_type=request.fabric_type.value
                    )
                    
                    # Upload to Cloudinary
                    high_res_url = self.uploader.upload_mockup(
                        high_res_mockup,
                        mockup_id,
                        view.value,
                        resolution="high",
                        quality=95
                    )
                    
                    web_res_url = self.uploader.upload_mockup(
                        web_res_mockup,
                        mockup_id,
                        view.value,
                        resolution="web",
                        quality=85
                    )
                    
                    views_result.append(MockupView(
                        view_type=view,
                        high_res_url=high_res_url,
                        web_res_url=web_res_url,
                        width=high_res_mockup.width,
                        height=high_res_mockup.height
                    ))
                    
                except Exception as e:
                    logger.error(
                        "view_generation_error",
                        mockup_id=mockup_id,
                        view=view.value,
                        error=str(e)
                    )
                    continue
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(
                "generate_mockup_complete",
                mockup_id=mockup_id,
                views_generated=len(views_result),
                processing_time_ms=processing_time
            )
            
            return {
                "success": True,
                "mockup_id": mockup_id,
                "product_sku": request.product_sku,
                "views": views_result,
                "generated_at": datetime.utcnow(),
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(
                "generate_mockup_error",
                mockup_id=mockup_id,
                error=str(e)
            )
            raise
    
    async def _download_design(self, url: str) -> Image.Image:
        """
        Download design image from URL
        
        Args:
            url: Image URL
        
        Returns:
            PIL Image
        """
        try:
            response = await self.http_client.get(url)
            response.raise_for_status()
            
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGBA
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            return image
            
        except Exception as e:
            logger.error("design_download_error", url=url, error=str(e))
            raise ValueError(f"Failed to download design from {url}: {str(e)}")
    
    def get_templates(self) -> List[dict]:
        """Get all available templates"""
        return self.template_manager.list_products()
    
    def get_template_by_sku(self, sku: str) -> Optional[dict]:
        """Get template by SKU"""
        return self.template_manager.get_template_by_sku(sku)
    
    async def close(self):
        """Clean up resources"""
        await self.http_client.aclose()
