"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FloatingDockProps {
    children?: ReactNode; // The avatar content (Orb state)
    isVisible: boolean;
    className?: string;
    onClick?: () => void;
}

export function FloatingDock({ children, isVisible, className, onClick }: FloatingDockProps) {
    return (
        <motion.div
            initial={{ y: 200, opacity: 0, scale: 0.5 }}
            animate={{
                y: isVisible ? 0 : 200,
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0.5
            }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className={cn(
                "fixed bottom-6 right-6 z-50 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-background shadow-2xl ring-1 ring-border hover:ring-primary",
                className
            )}
            onClick={onClick}
        >
            {/* Placeholder content if no children */}
            {children || <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-rose-400" />}
        </motion.div>
    );
}
