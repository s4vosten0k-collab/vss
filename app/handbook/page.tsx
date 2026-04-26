import { Suspense } from "react";
import { DiverHandbookApp } from "@/components/diver-handbook-app";

export default function HandbookPage() {
  return (
    <Suspense fallback={null}>
      <DiverHandbookApp />
    </Suspense>
  );
}
