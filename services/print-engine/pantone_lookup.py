"""
Pantone Color Lookup
Maps colors to nearest Pantone equivalents for screen printing
"""

from typing import Dict, Tuple

import numpy as np


# Common screen printing Pantone colors with LAB values
# LAB is used for perceptually uniform color comparison
PANTONE_COLORS: Dict[str, Dict] = {
    "Process Black": {
        "hex": "#000000",
        "lab": [0, 0, 0],
    },
    "White": {
        "hex": "#FFFFFF",
        "lab": [100, 0, 0],
    },
    "PMS 485 C": {  # Red
        "hex": "#DA291C",
        "lab": [52, 68, 56],
    },
    "PMS 186 C": {  # Bright Red
        "hex": "#C8102E",
        "lab": [47, 68, 43],
    },
    "PMS 289 C": {  # Navy Blue
        "hex": "#003366",
        "lab": [20, 10, -35],
    },
    "PMS 293 C": {  # Royal Blue
        "hex": "#003DA5",
        "lab": [26, 28, -65],
    },
    "PMS 300 C": {  # Blue
        "hex": "#0066B3",
        "lab": [45, 5, -45],
    },
    "PMS 116 C": {  # Gold/Yellow
        "hex": "#FFCD00",
        "lab": [85, 5, 85],
    },
    "PMS 123 C": {  # Bright Yellow
        "hex": "#FFC72C",
        "lab": [86, 5, 75],
    },
    "PMS 350 C": {  # Forest Green
        "hex": "#2D5F2D",
        "lab": [37, -30, 25],
    },
    "PMS 355 C": {  # Green
        "hex": "#009639",
        "lab": [55, -55, 40],
    },
    "PMS 375 C": {  # Bright Green
        "hex": "#78BE20",
        "lab": [73, -35, 60],
    },
    "PMS 259 C": {  # Purple
        "hex": "#6D2077",
        "lab": [30, 45, -35],
    },
    "PMS 267 C": {  # Violet
        "hex": "#5C068C",
        "lab": [28, 50, -50],
    },
    "PMS 151 C": {  # Orange
        "hex": "#FF6900",
        "lab": [70, 50, 75],
    },
    "PMS 172 C": {  # Bright Orange
        "hex": "#FA4616",
        "lab": [62, 60, 60],
    },
    "PMS 877 C": {  # Silver
        "hex": "#8A8D8F",
        "lab": [58, 0, -2],
    },
    "PMS 871 C": {  # Gold Metallic
        "hex": "#AE9263",
        "lab": [62, 5, 25],
    },
    "PMS 426 C": {  # Dark Gray
        "hex": "#25282A",
        "lab": [15, 0, -2],
    },
    "PMS 431 C": {  # Gray
        "hex": "#6C757D",
        "lab": [50, 0, -5],
    },
    "PMS 428 C": {  # Light Gray
        "hex": "#C1C6C8",
        "lab": [78, 0, -3],
    },
    "PMS 205 C": {  # Pink
        "hex": "#EC008C",
        "lab": [55, 80, 5],
    },
    "PMS 210 C": {  # Light Pink
        "hex": "#F57EB6",
        "lab": [72, 45, 5],
    },
    "PMS 325 C": {  # Teal
        "hex": "#009CA6",
        "lab": [60, -35, -15],
    },
    "PMS 327 C": {  # Dark Teal
        "hex": "#008578",
        "lab": [50, -40, -5],
    },
    "PMS 165 C": {  # Coral
        "hex": "#FF6B35",
        "lab": [65, 50, 50],
    },
    "PMS 130 C": {  # Golden Yellow
        "hex": "#F2A900",
        "lab": [75, 20, 75],
    },
    "PMS 3550 C": {  # Lime
        "hex": "#A4D65E",
        "lab": [80, -25, 55],
    },
    "PMS 2695 C": {  # Dark Purple
        "hex": "#2E1A47",
        "lab": [15, 20, -25],
    },
    "PMS 7700 C": {  # Turquoise
        "hex": "#00A9CE",
        "lab": [65, -25, -30],
    },
    "PMS 7621 C": {  # Burgundy
        "hex": "#7B0D29",
        "lab": [25, 45, 15],
    },
    "PMS 4625 C": {  # Brown
        "hex": "#4E3629",
        "lab": [25, 10, 15],
    },
    "PMS 7509 C": {  # Tan
        "hex": "#C4A77D",
        "lab": [68, 5, 25],
    },
    "PMS 7499 C": {  # Cream
        "hex": "#F2F0A1",
        "lab": [93, -5, 25],
    },
    "PMS 2995 C": {  # Cyan
        "hex": "#00A3E0",
        "lab": [65, -15, -45],
    },
    "PMS 805 C": {  # Hot Pink
        "hex": "#F04E98",
        "lab": [60, 65, 5],
    },
    "PMS 7549 C": {  # Safety Orange
        "hex": "#FF5E00",
        "lab": [65, 55, 70],
    },
    "PMS 7481 C": {  # Neon Green
        "hex": "#76C043",
        "lab": [72, -45, 55],
    },
    "PMS 7484 C": {  # Dark Green
        "hex": "#1E5631",
        "lab": [32, -25, 15],
    },
    "PMS 276 C": {  # Midnight Blue
        "hex": "#1B365D",
        "lab": [22, 5, -25],
    },
    "PMS 202 C": {  # Dark Red
        "hex": "#8E1C3B",
        "lab": [32, 45, 10],
    },
    "PMS 7409 C": {  # Mustard
        "hex": "#D4AF37",
        "lab": [70, 10, 60],
    },
    "PMS 7527 C": {  # Sage
        "hex": "#8FA68E",
        "lab": [65, -10, 10],
    },
    "PMS 7522 C": {  # Rust
        "hex": "#A9431E",
        "lab": [45, 40, 40],
    },
    "PMS 656 C": {  # Light Blue
        "hex": "#A4C8E1",
        "lab": [78, -5, -20],
    },
    "PMS 535 C": {  # Lavender
        "hex": "#9B8FBF",
        "lab": [62, 10, -20],
    },
    "PMS 7485 C": {  # Mint
        "hex": "#A8D5BA",
        "lab": [82, -20, 10],
    },
    "PMS 7520 C": {  # Peach
        "hex": "#F4C2A1",
        "lab": [80, 15, 25],
    },
    "PMS 7541 C": {  # Sky Blue
        "hex": "#7BA4DB",
        "lab": [65, 0, -30],
    },
    "PMS 7465 C": {  # Seafoam
        "hex": "#71C5B1",
        "lab": [75, -30, 5],
    },
    "PMS 7523 C": {  # Mauve
        "hex": "#C4A4A4",
        "lab": [70, 10, 5],
    },
    "PMS 7524 C": {  # Dusty Rose
        "hex": "#C9A595",
        "lab": [70, 15, 15],
    },
}


def _lab_distance(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """Calculate Euclidean distance in LAB color space"""
    return np.sqrt(np.sum((lab1 - lab2) ** 2))


def find_nearest_pantone(lab_color: np.ndarray) -> dict:
    """
    Find the nearest Pantone color to a given LAB color.

    Args:
        lab_color: LAB color as numpy array [L, A, B]

    Returns:
        Dictionary with name, pantone_code, and hex of nearest color
    """
    min_distance = float("inf")
    nearest_pantone = None
    nearest_name = None

    for name, info in PANTONE_COLORS.items():
        distance = _lab_distance(lab_color, np.array(info["lab"]))
        if distance < min_distance:
            min_distance = distance
            nearest_pantone = name
            nearest_name = name

    if nearest_pantone is None:
        # Fallback to black if something goes wrong
        return {
            "name": "Process Black",
            "pantone_code": "Process Black",
            "hex": "#000000",
        }

    return {
        "name": nearest_name,
        "pantone_code": nearest_pantone,
        "hex": PANTONE_COLORS[nearest_pantone]["hex"],
    }
