"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ClipboardCheck, ClipboardList, LifeBuoy, Radio, ScrollText, ShieldAlert, Stethoscope } from "lucide-react";
import { BottomNav, type TabConfig, type TabKey } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { PageContainer } from "@/components/page-container";
import { CallsignsPage } from "@/components/tabs/callsigns-page";
import { AssistantPage } from "@/components/tabs/assistant-page";
import { DocumentsPage } from "@/components/tabs/documents-page";
import { DutiesPage } from "@/components/tabs/duties-page";
import { SignalsPage } from "@/components/tabs/signals-page";
import { MedicinePage } from "@/components/tabs/medicine-page";
import { TestsPage } from "@/components/tabs/tests-page";

const tabs: TabConfig[] = [
  { key: "docs", label: "Документы", icon: ScrollText },
  { key: "duties", label: "Обязанности", icon: ClipboardList },
  { key: "callsigns", label: "Позывные", icon: Radio },
  { key: "signals", label: "Сигналы", icon: Activity },
  { key: "medicine", label: "Медицина", icon: Stethoscope },
  { key: "tests", label: "Тесты", icon: ClipboardCheck },
  { key: "assistant", label: "Павлик", icon: LifeBuoy },
  { key: "epbt", label: "Епбт", icon: ShieldAlert },
];

const tabTitles: Record<TabKey, string> = {
  docs: "Руководящие документы",
  duties: "Обязанности",
  callsigns: "Позывные",
  signals: "Сигналы",
  medicine: "Медицина",
  tests: "Тесты",
  formulas: "Формулы",
  assistant: "Павлик",
  epbt: "Епбт",
};

function isTabKey(value: string | null): value is TabKey {
  return Boolean(value && tabs.some((tab) => tab.key === value));
}

export function DiverHandbookApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTabParam = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(currentTabParam) ? currentTabParam : "docs";

  useEffect(() => {
    if (activeTab === "epbt") {
      router.replace("/handbook/epbt/");
    }
  }, [activeTab, router]);

  const content = useMemo(() => {
    switch (activeTab) {
      case "docs":
        return <DocumentsPage />;
      case "duties":
        return <DutiesPage />;
      case "callsigns":
        return <CallsignsPage />;
      case "signals":
        return <SignalsPage />;
      case "medicine":
        return <MedicinePage />;
      case "tests":
        return <TestsPage />;
      case "assistant":
        return <AssistantPage />;
      case "epbt":
        return null;
    }
  }, [activeTab]);

  const handleTabChange = (tab: TabKey) => {
    if (tab === "epbt") {
      router.push("/handbook/epbt/");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <Header title={tabTitles[activeTab]} />
      <PageContainer>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="animate-fade-up will-change-transform"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </PageContainer>
      <BottomNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
    </>
  );
}
