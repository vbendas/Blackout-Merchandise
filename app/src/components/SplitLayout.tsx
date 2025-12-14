"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SplitLayoutProps {
    children: ReactNode; // Main content (Canvas/Page)
    sidebar?: ReactNode; // Copilot/Avatar sidebar
    mode: "hero" | "copilot"; // Determines the layout state
    className?: string;
}

export function SplitLayout({ children, sidebar, mode, className }: SplitLayoutProps) {
    const isCopilot = mode === "copilot";

    return (
        <div className={cn("relative flex h-[calc(100vh-4rem)] w-full overflow-hidden", className)}>

            {/* Main Content Pane (Canvas/Hero) */}
            <motion.main
                layout
                className="relative z-0 h-full w-full bg-background"
                animate={{
                    width: isCopilot ? "75%" : "100%",
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                }}
            >
                {children}
            </motion.main>

            {/* Sidebar Pane (Copilot Studio) */}
            <AnimatePresence mode="popLayout">
                {isCopilot && (
                    <motion.aside
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                        }}
                        className="relative z-10 h-full w-[25%] border-l bg-sidebar shadow-xl"
                    >
                        {sidebar}
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}
