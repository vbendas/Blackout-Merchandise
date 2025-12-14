import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
    return (
        <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 text-center">

            {/* Background Gradient / Mesh (Optional) */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30 -z-10" />

            {/* Content */}
            <div className="container relative z-10 mx-auto max-w-4xl space-y-6">
                <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-7xl">
                    Your Art. Your Empire. <br className="hidden sm:block" />
                    <span className="text-primary">Zero Upfront Costs.</span>
                </h1>

                <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                    The first AI-powered merch platform for artists who care about quality.
                    Premium blanks, conversational design, and "invisible" fulfillment.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button size="lg" className="h-12 w-full px-8 sm:w-auto" asChild>
                        <Link href="/app">Start Designing</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="h-12 w-full px-8 sm:w-auto" asChild>
                        <Link href="/demo">Watch Demo</Link>
                    </Button>
                </div>
            </div>

            {/* Avatar Placeholder Area */}
            {/* This will be replaced by the <AvatarContainer mode="hero" /> later */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 opacity-50 blur-3xl rounded-full bg-primary/20 w-[600px] h-[600px] pointer-events-none" />

        </section>
    );
}
