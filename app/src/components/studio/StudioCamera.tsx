'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useStudio } from '@/lib/StudioContext';

const VIEW_PRESETS: Record<string, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0, 3),
  back: new THREE.Vector3(0, 0, -3),
  left: new THREE.Vector3(-3, 0, 0),
  right: new THREE.Vector3(3, 0, 0),
  detail: new THREE.Vector3(0, 0, 1.5),
};

export function StudioCamera() {
  const { activeView } = useStudio();
  const targetPosition = useRef(new THREE.Vector3(0, 0, 3));

  const target = useMemo(() => {
    return VIEW_PRESETS[activeView] || VIEW_PRESETS.front;
  }, [activeView]);

  useFrame((state) => {
    const camera = state.camera;
    // Smoothly interpolate camera position
    targetPosition.current.lerp(target, 0.05);
    camera.position.copy(targetPosition.current);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
