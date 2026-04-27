import { Suspense } from "react";
import { EpbtDocumentPage } from "@/components/epbt-document-page";

export default function AssistantEpbtFullPage() {
  return (
    <Suspense fallback={null}>
      <EpbtDocumentPage title="ЕПБТ • Источник" defaultReturnTo="/handbook/?tab=docs" />
    </Suspense>
  );
}
