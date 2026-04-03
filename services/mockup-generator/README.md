# Merch From - Mockup Generation Service

Python microservice for generating realistic product mockups with halftone effects and fabric textures.

## Features

- **Halftone Integration**: Shows actual dot patterns, not smooth designs
- **Dual Resolution**: 300 DPI for print files, 72 DPI for web
- **Fabric Textures**: Cotton, polyester, canvas, tri-blend overlays
- **Multi-View**: Flat, worn, closeup views per product
- **Stanley Stella Catalog**: Full support for all product categories

## Architecture

```
Node.js Backend → Python Microservice (FastAPI) → Cloudinary Storage
                     ↓
              Halftone → Template → Composite → Export
```

## Quick Start

### Prerequisites

- Python 3.11+
- Virtual environment
- Cloudinary account

### Installation

1. Create virtual environment:
```bash
cd services/mockup-generator
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Cloudinary credentials
```

4. Run development server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## API Endpoints

### Generate Single Mockup
```bash
POST /api/v1/mockups/generate
Content-Type: application/json

{
  "design_url": "https://example.com/design.png",
  "product_sku": "STTU755_CREATOR_BLACK",
  "views": ["flat", "worn"],
  "placement": "front_chest",
  "fabric_type": "cotton"
}
```

### Generate Batch Mockups
```bash
POST /api/v1/mockups/generate-batch
Content-Type: application/json

{
  "designs": [
    {
      "design_url": "https://example.com/design1.png",
      "product_sku": "STTU755_CREATOR_BLACK",
      "views": ["flat"]
    }
  ]
}
```

### List Templates
```bash
GET /api/v1/mockups/templates
```

## Project Structure

```
mockup-generator/
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── models.py      # Pydantic models
│   │   └── routes.py      # API routes
│   ├── config.py          # Configuration
│   └── utils/             # Utilities
├── templates/             # Product templates
│   └── stanley-stella/
├── assets/                # Fabric textures
│   └── textures/
├── tests/                 # Test suite
├── main.py                # FastAPI app
├── requirements.txt       # Dependencies
└── .env.example          # Environment template
```

## Development

### Running Tests
```bash
pytest
```

### Code Style
```bash
# Format with black
black .

# Lint with flake8
flake8 .
```

### Docker

Build image:
```bash
docker build -t mockup-generator .
```

Run container:
```bash
docker run -p 8000:8000 --env-file .env mockup-generator
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `MAX_WORKERS` | Parallel processing workers | No (default: 4) |
| `CORS_ORIGINS` | Allowed CORS origins | No |

## License

Proprietary - Merch From

## Related

- [Implementation Plan](../../Documentation/02-Roadmap/IMPLEMENTATION-PLAN-Mockup-Generation.md)
- [Mockup Architecture](../../Documentation/05-Shared/Mockup-Architecture-Reference.md)
