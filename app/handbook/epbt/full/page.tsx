import { Suspense } from "react";
import { EpbtDocumentPage } from "@/components/epbt-document-page";

export default function EpbtFullPage() {
  return (
    <Suspense fallback={null}>
      <EpbtDocumentPage />
    </Suspense>
  );
}
