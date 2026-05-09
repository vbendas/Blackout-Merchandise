# Print Engine Deployment Guide

## Overview

The Print Engine is a Python FastAPI microservice that handles image processing for screen printing previews. It performs:

1. **Color Separation** - Uses k-means clustering (placeholder for future U-Net model)
2. **Halftone Generation** - Creates halftone dot patterns with moire-prevention angles
3. **Composite Preview** - Combines layers into a final WebP preview

## Local Development

### Prerequisites

- Python 3.10+
- pip or uv

### Setup

```bash
cd services/print-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the service
uvicorn main:app --reload --port 8010
```

### Testing

```bash
# Health check
curl http://localhost:8010/health

# Process a design
curl -X POST http://localhost:8010/api/v1/process-design \
  -F "file=@/path/to/your/image.png" \
  -F "lpi=55" \
  -F "max_colors=6"
```

## Production Deployment

### Option A: Vercel Serverless (Recommended for MVP)

Vercel now supports Python serverless functions. This is the simplest deployment option.

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create `vercel.json` in project root:**
   ```json
   {
     "functions": {
       "services/print-engine/main.py": {
         "maxDuration": 30
       }
     },
     "routes": [
       {
         "src": "/api/print-engine/(.*)",
         "dest": "/services/print-engine/main.py"
       }
     ]
   }
   ```

3. **Update main.py for Vercel:**
   Add this at the bottom:
   ```python
   # Vercel serverless handler
   from mangum import Mangum
   handler = Mangum(app)
   ```

4. **Add to requirements.txt:**
   ```
   mangum>=0.17.0
   ```

5. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option B: Docker Container (Railway/Fly.io/Render)

For more control and longer processing times.

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8010

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
```

**Deploy to Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Deploy to Fly.io:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch

# Deploy
fly deploy
```

### Option C: Hivelocity GPU Server (For U-Net Model)

When the U-Net model is ready, deploy on a GPU server for faster inference.

**Requirements:**
- NVIDIA GPU with CUDA support
- Docker with NVIDIA Container Toolkit
- PyTorch with CUDA

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  print-engine:
    build: .
    ports:
      - "8010:8010"
    environment:
      - COLOR_SEPARATOR_ENGINE=unet
      - UNET_MODEL_PATH=/models/unet.pth
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models:/models:ro
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8010` |
| `COLOR_SEPARATOR_ENGINE` | Color separation algorithm (`kmeans` or `unet`) | `kmeans` |
| `UNET_MODEL_PATH` | Path to U-Net model file (when using `unet`) | `None` |
| `MAX_IMAGE_SIZE_MB` | Maximum upload size | `50` |
| `DEFAULT_LPI` | Default lines per inch | `55` |

## Swapping K-Means for U-Net

When the U-Net model is trained:

1. **Upload model file** to your deployment
2. **Set environment variable:**
   ```
   COLOR_SEPARATOR_ENGINE=unet
   UNET_MODEL_PATH=/path/to/unet_model.pth
   ```
3. **Restart service**

The code is already structured to support this - just change the config!

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Processing Time | <5s | For images under 5MB |
| Large Images | <15s | For images up to 50MB |
| Memory Usage | <2GB | Peak during processing |
| Concurrent Requests | 10 | Depends on deployment |

## Monitoring

**Health Endpoint:**
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "print-engine"
}
```

## Troubleshooting

**OpenCV Import Error:**
- Ensure system dependencies are installed (libgl1-mesa-glx)
- Use `opencv-python-headless` instead of `opencv-python`

**Memory Issues:**
- Reduce `MAX_IMAGE_SIZE_MB`
- Process images in chunks
- Use a larger deployment instance

**Slow Processing:**
- Use the fast halftone generator (`generate_halftone_fast`)
- Deploy on a server with more CPU cores
- Consider GPU deployment for U-Net

## Next Steps

1. **Train U-Net Model:** Work with Expert to train the Attention U-Net on screen printing dataset
2. **Optimize Performance:** Profile and optimize the k-means clustering
3. **Add Caching:** Cache processed results for identical images
4. **Queue System:** Add Redis queue for large batch processing
