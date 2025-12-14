import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StickyHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight">
                    <span className="h-6 w-6 bg-black rounded-full" /> {/* Placeholder Logo */}
                    Merch From
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Link href="/catalog" className="text-muted-foreground hover:text-foreground transition-colors">
                        Catalog
                    </Link>
                    <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                        Pricing
                    </Link>
                    <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                        Our Story
                    </Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium hover:underline">
                        Login
                    </Link>
                    <Button>Get Started</Button>
                </div>
            </div>
        </header>
    );
}
