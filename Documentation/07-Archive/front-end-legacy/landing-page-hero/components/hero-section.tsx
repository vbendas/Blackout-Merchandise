"use client"

import { Button } from "@/components/ui/button"
import { ChatPreview } from "@/components/chat-preview"

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="container mx-auto px-4 pt-16 pb-32 md:pt-24 md:pb-48">
        {/* Headline Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
            Your Art. Your Merch. <span className="text-[#D4AF37]">Zero Cost.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto text-balance">
            Create premium merchandise by just talking to our AI.
          </p>

          <Button
            size="lg"
            className="relative text-black font-semibold px-8 py-6 text-lg shadow-lg shadow-[#D4AF37]/20 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/30 overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)",
              backgroundSize: "200% 100%",
              backgroundPosition: "0% 0%",
              transition: "background-position 0.5s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundPosition = "100% 0%"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundPosition = "0% 0%"
            }}
          >
            Apply for Access
          </Button>
        </div>

        {/* Cropped Chat Window Preview */}
        <div className="max-w-3xl mx-auto">
          <ChatPreview />
        </div>
      </div>

      {/* Bottom Gradient Fade to Black */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
    </section>
  )
}
