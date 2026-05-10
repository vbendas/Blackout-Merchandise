'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { Icon } from '@iconify/react';

export function Features() {
  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-sans text-3xl md:text-4xl text-center mb-4 text-white">The Artist's Unfair Advantage</h2>
        <p className="text-zinc-400 text-center mb-16 max-w-2xl mx-auto">
          We built the infrastructure so you can focus on the art.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Design Studio Card */}
          <Card className="glass border border-white/10 bg-black/40 backdrop-blur-md">
            <CardHeader className="flex-col items-start gap-2 pb-2">
              <div className="flex items-center gap-2">
                <Icon icon="solar:magic-stick-3-bold-duotone" className="w-6 h-6 text-[#FFD700]" />
                <h3 className="text-xl font-semibold text-white">Design Studio</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-1">
              <p className="text-zinc-400 text-sm leading-relaxed">
                Collaborate with Leopoldo & Francisca to generate production-ready merch designs in seconds. No
                Photoshop required.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Text-to-Design
                </div>
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Smart Turnarounds
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Premium Quality Card */}
          <Card className="glass border border-white/10 bg-black/40 backdrop-blur-md">
            <CardHeader className="flex-col items-start gap-2 pb-2">
              <div className="flex items-center gap-2">
                <Icon icon="solar:t-shirt-bold-duotone" className="w-6 h-6 text-[#FFD700]" />
                <h3 className="text-xl font-semibold text-white">Curated Quality</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-1">
              <p className="text-zinc-400 text-sm leading-relaxed">
                We only source heavyweight, sustainably made blanks. High-fidelity printing that feels retail-ready, not
                cheap.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Heavyweight Cotton
                </div>
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Eco-Inks
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Logistics Card */}
          <Card className="glass border border-white/10 bg-black/40 backdrop-blur-md">
            <CardHeader className="flex-col items-start gap-2 pb-2">
              <div className="flex items-center gap-2">
                <Icon icon="solar:global-bold-duotone" className="w-6 h-6 text-[#FFD700]" />
                <h3 className="text-xl font-semibold text-white">Global Logistics</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-1">
              <p className="text-zinc-400 text-sm leading-relaxed">
                Distributed production network ensures your fans get their gear fast, wherever they are. Zero inventory
                risk.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Worldwide Shipping
                </div>
                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  Automated Routing
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
