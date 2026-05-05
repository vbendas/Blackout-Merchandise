'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import { useStudio } from '@/lib/StudioContext';
import { GarmentPlane } from './GarmentPlane';
import { DesignOverlay } from './DesignOverlay';
import { StudioCamera } from './StudioCamera';

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-zinc-500">Loading garment preview...</div>
    </div>
  );
}

export function GarmentCanvas() {
  const { selectedGarment } = useStudio();

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-zinc-900/50">
      {!selectedGarment ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">👕</div>
            <p className="text-lg font-medium text-white">Select a garment to start</p>
            <p className="mt-2 text-sm text-zinc-500">Choose from the toolbar above or the carousel below</p>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-5, 5, -5]} intensity={0.3} />
            <pointLight position={[0, 2, 0]} intensity={0.5} />

            {/* Garment */}
            <GarmentPlane />

            {/* Design overlay */}
            <DesignOverlay />

            {/* Contact shadows for realism */}
            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.3}
              scale={5}
              blur={2.5}
              far={4}
            />

            {/* Studio environment */}
            <Environment preset="studio" />

            {/* Camera controls */}
            <StudioCamera />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={1.5}
              maxDistance={5}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.5}
              autoRotate={false}
              target={[0, 0, 0]}
            />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
