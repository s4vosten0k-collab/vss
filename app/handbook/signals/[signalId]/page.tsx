import { SignalsDetailPage } from "@/components/signals-detail-page";
import { SIGNAL_DETAIL_IDS } from "@/lib/signals-data";

type PageProps = {
  params: {
    signalId: string;
  };
};

export function generateStaticParams() {
  return SIGNAL_DETAIL_IDS.map((signalId) => ({ signalId }));
}

export default function SignalDetailRoutePage({ params }: PageProps) {
  return <SignalsDetailPage signalId={params.signalId} />;
}
