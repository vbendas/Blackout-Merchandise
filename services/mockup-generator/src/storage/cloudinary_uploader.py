"""
Cloudinary Upload Module

Handles uploading generated mockups to Cloudinary CDN
"""

import io
import uuid
from typing import Optional, Tuple

import cloudinary
import cloudinary.uploader
from PIL import Image

from src.config import get_settings


class CloudinaryUploader:
    """
    Uploads images to Cloudinary CDN
    
    Handles:
    - Image upload with optimization
    - URL generation
    - Error handling and retries
    """
    
    def __init__(self):
        """Initialize Cloudinary with config"""
        settings = get_settings()
        
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True
        )
    
    def upload_mockup(
        self,
        image: Image.Image,
        mockup_id: str,
        view: str,
        resolution: str = "high",
        quality: int = 95
    ) -> str:
        """
        Upload a mockup image to Cloudinary
        
        Args:
            image: PIL Image to upload
            mockup_id: Unique mockup identifier
            view: View type (flat, worn, closeup)
            resolution: Resolution type (high, web)
            quality: JPEG quality (1-100)
        
        Returns:
            Public URL of uploaded image
        """
        # Convert image to bytes
        img_byte_arr = io.BytesIO()
        
        # Use WebP for web resolution, JPEG for high res
        if resolution == "web":
            image.save(img_byte_arr, format='WEBP', quality=85, optimize=True)
            extension = "webp"
        else:
            image.save(img_byte_arr, format='JPEG', quality=quality, optimize=True)
            extension = "jpg"
        
        img_byte_arr.seek(0)
        
        # Generate public ID
        public_id = f"merch-from/mockups/{mockup_id}/{view}_{resolution}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            img_byte_arr,
            public_id=public_id,
            overwrite=True,
            resource_type="image"
        )
        
        return result['secure_url']
    
    def upload_batch(
        self,
        images: list,
        mockup_id: str
    ) -> list:
        """
        Upload multiple mockup images
        
        Args:
            images: List of (image, view, resolution) tuples
            mockup_id: Mockup identifier
        
        Returns:
            List of upload results
        """
        results = []
        
        for image, view, resolution in images:
            try:
                url = self.upload_mockup(image, mockup_id, view, resolution)
                results.append({
                    "view": view,
                    "resolution": resolution,
                    "url": url,
                    "success": True
                })
            except Exception as e:
                results.append({
                    "view": view,
                    "resolution": resolution,
                    "url": None,
                    "success": False,
                    "error": str(e)
                })
        
        return results
    
    def generate_transformation_url(
        self,
        public_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        quality: str = "auto"
    ) -> str:
        """
        Generate a transformation URL for an existing image
        
        Args:
            public_id: Cloudinary public ID
            width: Target width
            height: Target height
            quality: Quality setting
        
        Returns:
            Transformed image URL
        """
        options = {
            "quality": quality,
            "fetch_format": "auto"
        }
        
        if width:
            options["width"] = width
        if height:
            options["height"] = height
        
        return cloudinary.CloudinaryImage(public_id).build_url(**options)
    
    def delete_mockup(self, public_id: str) -> bool:
        """
        Delete a mockup from Cloudinary
        
        Args:
            public_id: Public ID of image to delete
        
        Returns:
            True if successful
        """
        try:
            result = cloudinary.uploader.destroy(public_id)
            return result.get('result') == 'ok'
        except Exception:
            return False
