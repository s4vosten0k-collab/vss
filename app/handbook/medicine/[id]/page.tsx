import { notFound } from "next/navigation";
import { MedicineBlockDetailPage } from "@/components/medicine-block-detail-page";
import { diverMedicineBlocks } from "@/lib/diver-medicine-data";
import { allMedicinePathParams, parseMedicinePathId } from "@/lib/medicine-path";

export function generateStaticParams() {
  return allMedicinePathParams();
}

type PageProps = {
  params: {
    id: string;
  };
};

export default function MedicineItemPage({ params }: PageProps) {
  const id = parseMedicinePathId(params.id);
  const block = diverMedicineBlocks.find((b) => b.id === id);
  if (!block) {
    notFound();
  }
  return <MedicineBlockDetailPage block={block} />;
}
