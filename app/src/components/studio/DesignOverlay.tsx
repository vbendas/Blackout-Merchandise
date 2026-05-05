'use client';

import { useTexture } from '@react-three/drei';
import { useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useStudio } from '@/lib/StudioContext';

export function DesignOverlay() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { designInstances, designPosition, setDesignPosition } = useStudio();
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const design = designInstances[0];

  const texture = useTexture(
    design?.designUrl || ''
  );



  // Calculate aspect ratio
  const aspectRatio = useMemo(() => {
    if (texture?.image) {
      const img = texture.image as HTMLImageElement;
      return img.width / img.height;
    }
    return 1;
  }, [texture]);

  const designWidth = 0.4 * designPosition.scale;
  const designHeight = designWidth / aspectRatio;

  const dragStartPos = useRef({ x: 0, y: 0 });
  const designStartPos = useRef({ x: 0, y: 0 });

  // Handle pointer events for dragging
  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();
      setIsDragging(true);

      // Store initial positions
      dragStartPos.current = { x: e.point.x, y: e.point.y };
      designStartPos.current = { x: designPosition.x, y: designPosition.y };
    },
    [designPosition]
  );

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!isDragging) return;

      const deltaX = e.point.x - dragStartPos.current.x;
      const deltaY = e.point.y - dragStartPos.current.y;

      setDesignPosition((prev) => ({
        ...prev,
        x: designStartPos.current.x + deltaX,
        y: designStartPos.current.y + deltaY,
      }));
    },
    [isDragging, setDesignPosition]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!design) return null;

  return (
    <mesh
      ref={meshRef}
      position={[designPosition.x, designPosition.y, 0.01]}
      rotation={[0, 0, (designPosition.rotation * Math.PI) / 180]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        setHovered(false);
        setIsDragging(false);
      }}
      castShadow
    >
      <planeGeometry args={[designWidth, designHeight]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        opacity={0.95}
        side={THREE.DoubleSide}
        depthTest={true}
        depthWrite={false}
      />

      {/* Selection border */}
      {hovered && (
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(designWidth, designHeight)]} />
          <lineBasicMaterial color="#E11D48" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}
