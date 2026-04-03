"""
Color Clustering Engine

Extracts dominant colors from images using K-means clustering.
"""

import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json


@dataclass
class ColorCluster:
    """Represents a dominant color cluster extracted from an image."""
    rgb: Tuple[int, int, int]
    hex: str
    coverage: float
    pixel_count: int
    cluster_id: int
    
    def to_dict(self) -> Dict:
        return {
            "rgb": self.rgb,
            "hex": self.hex,
            "coverage": self.coverage,
            "pixel_count": self.pixel_count,
            "cluster_id": self.cluster_id
        }


class ColorClusteringEngine:
    """
    Extracts dominant colors from images using K-means clustering.
    
    Supports:
    - Configurable number of clusters (1-8)
    - Color similarity merging
    - Minimum coverage threshold filtering
    - Alpha/transparency handling
    """
    
    def __init__(
        self,
        max_clusters: int = 8,
        min_coverage_threshold: float = 0.02,
        similarity_threshold: float = 30,
        max_iterations: int = 50,
        random_seed: int = 42
    ):
        """
        Initialize the clustering engine.
        
        Args:
            max_clusters: Maximum number of color clusters (1-8)
            min_coverage_threshold: Minimum coverage (0-1) to keep a cluster
            similarity_threshold: RGB distance below which colors are merged
            max_iterations: Maximum K-means iterations
            random_seed: Random seed for reproducibility
        """
        self.max_clusters = max_clusters
        self.min_coverage_threshold = min_coverage_threshold
        self.similarity_threshold = similarity_threshold
        self.max_iterations = max_iterations
        self.random_seed = random_seed
    
    def rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB tuple to hex string."""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    
    def hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex string to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def color_distance(self, rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
        """
        Calculate Euclidean distance between two RGB colors.
        
        Args:
            rgb1: First RGB color
            rgb2: Second RGB color
            
        Returns:
            Euclidean distance (0-441)
        """
        return np.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))
    
    def load_image(self, image_path: str) -> np.ndarray:
        """
        Load and preprocess image for clustering.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Numpy array of RGB pixels
        """
        img = Image.open(image_path)
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        if img.size[0] * img.size[1] > 1000000:
            max_dim = 1000
            ratio = min(max_dim / img.size[0], max_dim / img.size[1])
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        return np.array(img)
    
    def initialize_centroids(
        self, 
        pixels: np.ndarray, 
        k: int
    ) -> np.ndarray:
        """Initialize cluster centroids using k-means++ method."""
        np.random.seed(self.random_seed)
        
        centroids = []
        
        first_idx = np.random.randint(len(pixels))
        centroids.append(pixels[first_idx].astype(float))
        
        for _ in range(1, k):
            distances = np.zeros(len(pixels))
            
            for i, pixel in enumerate(pixels):
                min_dist = min(
                    self.color_distance(pixel, centroid) 
                    for centroid in centroids
                )
                distances[i] = min_dist ** 2
            
            probabilities = distances / distances.sum()
            next_idx = np.random.choice(len(pixels), p=probabilities)
            centroids.append(pixels[next_idx].astype(float))
        
        return np.array(centroids)
    
    def assign_clusters(
        self, 
        pixels: np.ndarray, 
        centroids: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Assign each pixel to nearest centroid.
        
        Returns:
            Tuple of (cluster_assignments, distances_to_centroid)
        """
        n_pixels = len(pixels)
        n_centroids = len(centroids)
        
        distances = np.zeros((n_pixels, n_centroids))
        
        for i, centroid in enumerate(centroids):
            distances[:, i] = np.sqrt(
                np.sum((pixels - centroid) ** 2, axis=1)
            )
        
        cluster_assignments = np.argmin(distances, axis=1)
        min_distances = np.min(distances, axis=1)
        
        return cluster_assignments, min_distances
    
    def update_centroids(
        self, 
        pixels: np.ndarray, 
        cluster_assignments: np.ndarray, 
        k: int
    ) -> np.ndarray:
        """Update centroids to mean of assigned pixels."""
        new_centroids = np.zeros((k, 3))
        
        for i in range(k):
            cluster_pixels = pixels[cluster_assignments == i]
            if len(cluster_pixels) > 0:
                new_centroids[i] = np.mean(cluster_pixels, axis=0)
            else:
                new_centroids[i] = np.random.randint(0, 256, 3)
        
        return new_centroids
    
    def kmeans_clustering(
        self, 
        pixels: np.ndarray, 
        k: int
    ) -> List[ColorCluster]:
        """
        Perform K-means clustering on pixels.
        
        Args:
            pixels: Numpy array of RGB pixels
            k: Number of clusters
            
        Returns:
            List of ColorCluster objects
        """
        np.random.seed(self.random_seed)
        
        centroids = self.initialize_centroids(pixels, k)
        
        for iteration in range(self.max_iterations):
            cluster_assignments, _ = self.assign_clusters(pixels, centroids)
            
            new_centroids = self.update_centroids(pixels, cluster_assignments, k)
            
            if np.allclose(centroids, new_centroids, atol=1.0):
                break
            
            centroids = new_centroids
        
        cluster_assignments, min_distances = self.assign_clusters(pixels, centroids)
        
        total_pixels = len(pixels)
        clusters = []
        
        for i in range(k):
            cluster_pixels = pixels[cluster_assignments == i]
            pixel_count = len(cluster_pixels)
            
            if pixel_count == 0:
                continue
            
            coverage = pixel_count / total_pixels
            
            if coverage < self.min_coverage_threshold:
                continue
            
            mean_color = np.mean(cluster_pixels, axis=0)
            rgb = tuple(int(c) for c in mean_color)
            
            cluster = ColorCluster(
                rgb=rgb,
                hex=self.rgb_to_hex(rgb),
                coverage=coverage,
                pixel_count=pixel_count,
                cluster_id=i
            )
            clusters.append(cluster)
        
        clusters.sort(key=lambda c: c.coverage, reverse=True)
        
        return clusters
    
    def merge_similar_colors(
        self, 
        clusters: List[ColorCluster]
    ) -> List[ColorCluster]:
        """
        Merge clusters with similar colors.
        
        Args:
            clusters: List of ColorCluster objects
            
        Returns:
            List of merged ColorCluster objects
        """
        if len(clusters) <= 1:
            return clusters
        
        merged = []
        used = set()
        
        for i, cluster in enumerate(clusters):
            if i in used:
                continue
            
            current_cluster = cluster
            similar_indices = [i]
            
            for j, other in enumerate(clusters[i + 1:], start=i + 1):
                if j in used:
                    continue
                
                dist = self.color_distance(cluster.rgb, other.rgb)
                if dist < self.similarity_threshold:
                    similar_indices.append(j)
            
            if len(similar_indices) > 1:
                total_pixels = sum(clusters[idx].pixel_count for idx in similar_indices)
                weighted_rgb = np.zeros(3)
                
                for idx in similar_indices:
                    weight = clusters[idx].pixel_count / total_pixels
                    weighted_rgb += np.array(clusters[idx].rgb) * weight
                
                new_rgb = tuple(int(c) for c in weighted_rgb)
                total_coverage = sum(clusters[idx].coverage for idx in similar_indices)
                
                current_cluster = ColorCluster(
                    rgb=new_rgb,
                    hex=self.rgb_to_hex(new_rgb),
                    coverage=total_coverage,
                    pixel_count=total_pixels,
                    cluster_id=i
                )
            
            merged.append(current_cluster)
            used.update(similar_indices)
        
        merged.sort(key=lambda c: c.coverage, reverse=True)
        
        return merged[:self.max_clusters]
    
    def extract_colors(
        self, 
        image_path: str,
        num_colors: Optional[int] = None
    ) -> List[ColorCluster]:
        """
        Extract dominant colors from an image.
        
        Args:
            image_path: Path to the image file
            num_colors: Number of colors to extract (default: max_clusters)
            
        Returns:
            List of ColorCluster objects sorted by coverage
        """
        if num_colors is None:
            num_colors = self.max_clusters
        
        num_colors = min(num_colors, self.max_clusters)
        num_colors = max(num_colors, 1)
        
        pixels = self.load_image(image_path)
        
        pixels_2d = pixels.reshape(-1, 3)
        
        valid_mask = (
            (pixels_2d[:, 0] > 10) | 
            (pixels_2d[:, 1] > 10) | 
            (pixels_2d[:, 2] > 10)
        )
        filtered_pixels = pixels_2d[valid_mask]
        
        if len(filtered_pixels) < 10:
            return []
        
        clusters = self.kmeans_clustering(filtered_pixels, num_colors)
        
        clusters = self.merge_similar_colors(clusters)
        
        for i, cluster in enumerate(clusters):
            cluster.cluster_id = i
        
        return clusters
    
    def extract_colors_from_array(
        self, 
        image_array: np.ndarray,
        num_colors: Optional[int] = None
    ) -> List[ColorCluster]:
        """
        Extract dominant colors from a numpy array.
        
        Args:
            image_array: Numpy array of RGB pixels
            num_colors: Number of colors to extract
            
        Returns:
            List of ColorCluster objects sorted by coverage
        """
        if num_colors is None:
            num_colors = self.max_clusters
        
        num_colors = min(num_colors, self.max_clusters)
        num_colors = max(num_colors, 1)
        
        if len(image_array.shape) == 3:
            pixels_2d = image_array.reshape(-1, 3)
        else:
            pixels_2d = image_array
        
        valid_mask = (
            (pixels_2d[:, 0] > 10) | 
            (pixels_2d[:, 1] > 10) | 
            (pixels_2d[:, 2] > 10)
        )
        filtered_pixels = pixels_2d[valid_mask]
        
        if len(filtered_pixels) < 10:
            return []
        
        clusters = self.kmeans_clustering(filtered_pixels, num_colors)
        
        clusters = self.merge_similar_colors(clusters)
        
        for i, cluster in enumerate(clusters):
            cluster.cluster_id = i
        
        return clusters


def main():
    """Test the clustering engine."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python color_clustering.py <image_path> [num_colors]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    num_colors = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    
    engine = ColorClusteringEngine(
        max_clusters=num_colors,
        min_coverage_threshold=0.02,
        similarity_threshold=30
    )
    
    print(f"Extracting {num_colors} colors from {image_path}...")
    
    clusters = engine.extract_colors(image_path, num_colors)
    
    print(f"\nFound {len(clusters)} dominant colors:")
    print("-" * 60)
    
    for cluster in clusters:
        print(f"Color {cluster.cluster_id + 1}:")
        print(f"  RGB: {cluster.rgb}")
        print(f"  Hex: {cluster.hex}")
        print(f"  Coverage: {cluster.coverage * 100:.2f}%")
        print(f"  Pixels: {cluster.pixel_count:,}")
        print()


if __name__ == "__main__":
    main()
