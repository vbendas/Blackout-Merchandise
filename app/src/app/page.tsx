import { StickyHeader } from "@/components/StickyHeader";
import { HeroSection } from "@/components/HeroSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <StickyHeader />
      <HeroSection />
    </main>
  );
}
