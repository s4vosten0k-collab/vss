import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className="app-shell min-h-dvh bg-background/95 pb-28">
      <main className={cn("px-4 pb-4 pt-3 md:px-6", className)}>{children}</main>
    </div>
  );
}
