'use client';

import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useStudio } from '@/lib/StudioContext';

export function GarmentPlane() {
  const { selectedGarment } = useStudio();

  const texture = useTexture(
    selectedGarment?.imagePath || '/Assets/Blank Images/PBM0_STSU177_C002.jpg'
  );



  // Calculate aspect ratio to maintain proportions
  const aspectRatio = useMemo(() => {
    if (texture?.image) {
      const img = texture.image as HTMLImageElement;
      return img.width / img.height;
    }
    return 0.75; // Default 3:4 ratio
  }, [texture]);

  const planeWidth = 1.5;
  const planeHeight = planeWidth / aspectRatio;

  if (!selectedGarment) return null;

  return (
    <mesh position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
