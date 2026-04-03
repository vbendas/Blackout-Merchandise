"""
Configuration management for Mockup Generation Service
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    app_name: str = "Mockup Generation Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS
    cors_origins: List[str] = ["*"]
    
    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    
    # Processing
    max_image_size: int = 50 * 1024 * 1024  # 50MB
    supported_formats: List[str] = ["png", "jpg", "jpeg", "webp"]
    
    # Performance
    max_workers: int = 4
    request_timeout: int = 300  # 5 minutes
    
    # Paths
    templates_dir: str = "./templates"
    assets_dir: str = "./assets"
    temp_dir: str = "./temp"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
