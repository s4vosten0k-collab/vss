import { Suspense } from "react";
import { MedicineDocumentPage } from "@/components/medicine-document-page";

export default function AssistantMedicineFullPage() {
  return (
    <Suspense fallback={null}>
      <MedicineDocumentPage title="Мед. справочник • Источник" defaultReturnTo="/handbook/?tab=assistant" />
    </Suspense>
  );
}
