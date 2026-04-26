import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background/95 pb-24">
      <main className={cn("px-4 pb-4 pt-3", className)}>{children}</main>
    </div>
  );
}
