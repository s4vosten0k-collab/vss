"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { CALLSIGN_SECTIONS } from "@/lib/callsigns-data";
import type { DualRow } from "@/lib/callsigns-data";

type CallsignsDetailPageProps = {
  sectionId: string;
};

type CallsignEntry = {
  role: string;
  callsign: string;
};

type CallsignGroup = {
  id: string;
  title: string;
  subtitle: string;
  entries: CallsignEntry[];
};

function toEntries(rows: DualRow[]): CallsignEntry[] {
  return rows
    .flatMap((row) => [
      { role: row.leftRole, callsign: row.leftCallsign },
      { role: row.rightRole, callsign: row.rightCallsign },
    ])
    .filter((entry) => entry.role.trim().length > 0 && entry.callsign.trim().length > 0);
}

function classifyUnitEntry(role: string): CallsignGroup["id"] {
  const value = role.toLowerCase();

  if (value.includes("спср") || value.includes("пожарно-спас") || value.includes("пожарноспас")) {
    return "spsr";
  }

  if (value.includes("медик") || value.includes("врач") || value.includes("медицин")) {
    return "medics";
  }

  if (value.includes("водолаз") || value.includes("всс")) {
    return "diving";
  }

  if (value.includes("хим") || value.includes("хрз")) {
    return "chem";
  }

  if (
    value.includes("автомобиль") ||
    value.includes("автоцистерна") ||
    value.includes("цистерна") ||
    value.includes("ахрз") ||
    value.includes("аса") ||
    value.includes("абр") ||
    value.includes("агдс") ||
    value.includes("авс") ||
    value.includes("амс")
  ) {
    return "vehicles";
  }

  return "command";
}

function buildUnitGroups(rows: DualRow[]): CallsignGroup[] {
  const base: CallsignGroup[] = [
    { id: "command", title: "Руководство и управление", subtitle: "Командование ПАСО и дежурное управление", entries: [] },
    { id: "spsr", title: "СПСР", subtitle: "Пожарно-спасательная служба", entries: [] },
    { id: "chem", title: "Химическая служба (ХРЗ)", subtitle: "ХРЗ и химические подразделения", entries: [] },
    { id: "diving", title: "Водолазная служба", subtitle: "ВСС и водолазные подразделения", entries: [] },
    { id: "medics", title: "Медицинская служба", subtitle: "Медики и медицинское сопровождение", entries: [] },
    { id: "vehicles", title: "Техника и спецавто", subtitle: "Автомобили и технические средства", entries: [] },
  ];

  const groupMap = new Map(base.map((group) => [group.id, group]));

  for (const entry of toEntries(rows)) {
    const groupId = classifyUnitEntry(entry.role);
    groupMap.get(groupId)?.entries.push(entry);
  }

  const commandPriority = (role: string) => {
    const value = role.toLowerCase();
    if (value.includes("начальник отряда")) return 0;
    if (value.includes("заместитель начальника отряда") || value.includes("заместитель нач. отряда по отр")) return 1;
    if (value.includes("заместитель нач. отряда по ир и ко")) return 2;
    if (value.includes("начальник службы")) return 3;
    if (value.includes("начальник дежурной смены")) return 99;
    return 100;
  };

  const chemPriority = (role: string) => {
    const value = role.toLowerCase();
    if (value.includes("начальник службы хрз")) return 0;
    if (value.includes("инженер службы хрз")) return 1;
    if (value.includes("отделение службы хрз")) return 2;
    if (value.includes("командир отделения химической")) return 3;
    if (value.includes("автомобиль химической")) return 4;
    return 100;
  };

  const divingPriority = (role: string) => {
    const value = role.toLowerCase();
    if (value.includes("начальник всс")) return 0;
    if (value.includes("отделение всс")) return 1;
    if (value.includes("автомобиль всс")) return 2;
    return 100;
  };

  const medicsPriority = (role: string) => {
    const value = role.toLowerCase();
    if (value.includes("начальник медицинской службы")) return 0;
    if (value.includes("врач")) return 1;
    if (value.includes("отделение медицинской службы")) return 2;
    if (value.includes("автомобиль медицинской службы")) return 3;
    return 100;
  };

  const spsrPriority = (role: string) => {
    const value = role.toLowerCase();
    if (value.includes("начальник службы спср") || value.includes("начальник спср")) return 0;
    if (value.includes("командир") && (value.includes("пожарно-спас") || value.includes("пожарноспас"))) return 1;
    if (value.includes("начальник дежурной смены пасо")) return 2;
    return 100;
  };

  return base
    .map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => {
        if (group.id === "command") {
          const aPriority = commandPriority(a.role);
          const bPriority = commandPriority(b.role);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
        if (group.id === "chem") {
          const aPriority = chemPriority(a.role);
          const bPriority = chemPriority(b.role);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
        if (group.id === "diving") {
          const aPriority = divingPriority(a.role);
          const bPriority = divingPriority(b.role);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
        if (group.id === "medics") {
          const aPriority = medicsPriority(a.role);
          const bPriority = medicsPriority(b.role);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
        if (group.id === "spsr") {
          const aPriority = spsrPriority(a.role);
          const bPriority = spsrPriority(b.role);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
        }
        return a.role.localeCompare(b.role, "ru");
      }),
    }))
    .filter((group) => group.entries.length > 0);
}

export function CallsignsDetailPage({ sectionId }: CallsignsDetailPageProps) {
  const section = CALLSIGN_SECTIONS.find((item) => item.id === sectionId);
  const isPasoSection = section?.id === "units";
  const pasoGroups = isPasoSection ? buildUnitGroups(section.rows) : [];

  if (!section) {
    return (
      <>
        <Header title="Позывные" />
        <div className="mx-auto min-h-dvh max-w-lg bg-background/95 pb-24 xl:max-w-6xl">
          <main className="space-y-4 px-4 pb-4 pt-3">
            <section className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-foreground">
              Раздел не найден.
            </section>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={section.title} />
      <div className="mx-auto min-h-dvh max-w-lg bg-background/95 pb-24 xl:max-w-6xl">
        <main className="space-y-4 px-4 pb-4 pt-3">
          <section className="rounded-xl border border-border/70 bg-secondary/10 p-3">
            <p className="mb-3 text-sm text-muted-foreground">{section.subtitle}</p>

            {(isPasoSection
              ? pasoGroups.map((group) => ({
                  id: group.id,
                  title: group.title,
                  subtitle: group.subtitle,
                  rows: group.entries.map((entry) => ({
                    leftRole: entry.role,
                    leftCallsign: entry.callsign,
                    rightRole: "",
                    rightCallsign: "",
                  })),
                }))
              : section.groups?.length
                ? section.groups
                : [{ id: `${section.id}-all`, title: "Таблица", rows: section.rows }]
            ).map((group) => (
              <div key={group.id} className="mb-3 last:mb-0 rounded-xl border border-primary/20 bg-background/30 p-2.5">
                <p className="text-sm font-semibold text-card-foreground">{group.title}</p>

                <div className="mt-2 hidden overflow-x-auto rounded-xl border border-border/70 md:block">
                  <table className={`w-full table-fixed border-collapse text-xs ${isPasoSection ? "min-w-[560px]" : "min-w-[720px]"}`}>
                    <thead>
                      <tr className="bg-secondary/35">
                        <th className="w-[39%] border border-border px-2 py-2 text-left font-semibold">Должность</th>
                        <th className="w-[11%] border border-border px-2 py-2 text-left font-semibold">Позывной</th>
                        {!isPasoSection ? (
                          <>
                            <th className="w-[39%] border border-border px-2 py-2 text-left font-semibold">Должность</th>
                            <th className="w-[11%] border border-border px-2 py-2 text-left font-semibold">Позывной</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={`${group.id}-${row.leftRole}-${row.rightRole}`} className="align-top odd:bg-background even:bg-secondary/5">
                          <td className="border border-border px-2 py-2 leading-5 text-card-foreground">{row.leftRole}</td>
                          <td className="border border-border px-2 py-2 font-semibold leading-5 text-primary">{row.leftCallsign}</td>
                          {!isPasoSection ? (
                            <>
                              <td className="border border-border px-2 py-2 leading-5 text-card-foreground">{row.rightRole}</td>
                              <td className="border border-border px-2 py-2 font-semibold leading-5 text-primary">{row.rightCallsign}</td>
                            </>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 space-y-2 md:hidden">
                  {group.rows.map((row) => (
                    <div key={`${group.id}-${row.leftRole}-${row.rightRole}`} className="rounded-xl border border-border/70 bg-secondary/15 p-2.5">
                      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
                        <p className="text-xs leading-5 text-card-foreground">{row.leftRole}</p>
                        <p className="text-xs font-semibold leading-5 text-primary">{row.leftCallsign}</p>
                        {row.rightRole ? <p className="text-xs leading-5 text-card-foreground">{row.rightRole}</p> : null}
                        {row.rightCallsign ? <p className="text-xs font-semibold leading-5 text-primary">{row.rightCallsign}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex w-full max-w-lg items-center justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] xl:max-w-6xl">
          <Link
            href="/handbook/?tab=callsigns"
            className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </div>
      </div>
    </>
  );
}
