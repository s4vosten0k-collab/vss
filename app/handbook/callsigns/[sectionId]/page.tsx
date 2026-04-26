import { CallsignsDetailPage } from "@/components/callsigns-detail-page";
import { CALLSIGN_SECTION_IDS } from "@/lib/callsigns-data";

type PageProps = {
  params: {
    sectionId: string;
  };
};

export function generateStaticParams() {
  return CALLSIGN_SECTION_IDS.map((sectionId) => ({ sectionId }));
}

export default function CallsignsSectionPage({ params }: PageProps) {
  return <CallsignsDetailPage sectionId={params.sectionId} />;
}
