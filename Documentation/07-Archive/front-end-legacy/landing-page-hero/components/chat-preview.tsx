import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ChatPreview() {
  return (
    <div className="relative">
      <div
        className="relative rounded-2xl border-2 border-[#D4AF37] bg-[#0A0A0A] overflow-hidden"
        style={{
          maxHeight: "500px",
          maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          boxShadow: "0 0 40px rgba(212, 175, 55, 0.15)",
        }}
      >
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#D4AF37]/30 bg-black/50 backdrop-blur-sm">
          <Avatar className="h-10 w-10 border border-[#D4AF37]/50">
            <AvatarImage src="/ai-assistant-avatar.png" />
            <AvatarFallback className="bg-[#D4AF37] text-black font-semibold">L</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Leopoldo</h3>
            <p className="text-xs text-[#D4AF37]">● Online</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-4 space-y-4 pb-24">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-gray-200">I want to create a hoodie with my abstract art design</p>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-gray-100">
                Amazing! I'd love to help you create a premium hoodie. Could you describe your abstract art or upload an
                image?
              </p>
            </div>
          </div>

          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-gray-200">It's a blend of gold swirls and dark geometric patterns</p>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-gray-100">
                Perfect! That sounds stunning. Let me generate some premium hoodie mockups with your design. What's your
                preferred placement—front, back, or all-over print?
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 bg-black/80 backdrop-blur-md border-t border-[#D4AF37]/30">
          <div className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3">
            <input
              type="text"
              placeholder="Describe your merch idea..."
              className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none"
              disabled
            />
            <button className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#C5A028] flex items-center justify-center hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all">
              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />
    </div>
  )
}
