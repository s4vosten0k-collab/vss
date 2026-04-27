"use client";

import { motion } from "framer-motion";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="app-shell px-4 py-4 md:px-6">
        <motion.h1
          key={title}
          className="text-lg font-semibold tracking-tight text-foreground will-change-transform"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>
      </div>
    </header>
  );
}
