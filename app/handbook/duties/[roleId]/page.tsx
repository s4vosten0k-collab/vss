import { DutiesDetailPage } from "@/components/duties-detail-page";
import { DUTY_DETAIL_IDS } from "@/lib/duties-data";

type PageProps = {
  params: {
    roleId: string;
  };
};

export function generateStaticParams() {
  return DUTY_DETAIL_IDS.map((roleId) => ({ roleId }));
}

export default function DutiesRolePage({ params }: PageProps) {
  return <DutiesDetailPage roleId={params.roleId} />;
}
