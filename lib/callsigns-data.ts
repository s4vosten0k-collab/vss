export type DualRow = {
  leftRole: string;
  leftCallsign: string;
  rightRole: string;
  rightCallsign: string;
};

export type CallsignSection = {
  id: string;
  title: string;
  subtitle: string;
  rows: DualRow[];
  groups?: {
    id: string;
    title: string;
    subtitle?: string;
    rows: DualRow[];
  }[];
};

const commandRows: DualRow[] = [
  {
    leftRole: "Начальник управления",
    leftCallsign: "01",
    rightRole: "Начальник центра",
    rightCallsign: "10 (Гомель)*",
  },
  {
    leftRole: "Первый заместитель начальника управления",
    leftCallsign: "02",
    rightRole: "Заместитель начальника центра - начальник штаба ЛЧС",
    rightCallsign: "20 (Гомель)*",
  },
  {
    leftRole: "Заместитель начальника, курирующий оперативно-тактическую работу",
    leftCallsign: "03",
    rightRole: "Главный оперативный дежурный",
    rightCallsign: "30 (Гомель)*",
  },
  {
    leftRole: "Заместитель начальника, курирующий идеологическую и кадровую работу",
    leftCallsign: "04",
    rightRole: "Помощник главного оперативного дежурного",
    rightCallsign: "60 (Гомель)*",
  },
  {
    leftRole: "Заместитель начальника, курирующий материально-техническое обеспечение",
    leftCallsign: "05",
    rightRole: "Главный специалист - начальник ППУ",
    rightCallsign: "70 (Гомель)*",
  },
];

const hqRows: DualRow[] = [
  {
    leftRole: "Заместитель начальника штаба ЛЧС",
    leftCallsign: "40 (Гомель)*",
    rightRole: "Начальник ЦОУ",
    rightCallsign: "80*** (Центр)*",
  },
  {
    leftRole: "Старший помощник начальника штаба ЛЧС",
    leftCallsign: "50 (Гомель)*",
    rightRole: "Старший помощник начальника ЦОУ",
    rightCallsign: "90** (Центр)*",
  },
  {
    leftRole: "АШ",
    leftCallsign: "ШТАБ-1",
    rightRole: "АШ",
    rightCallsign: "ШТАБ-1 (Центр)*",
  },
  {
    leftRole: "АШ резерв",
    leftCallsign: "ШТАБ-2",
    rightRole: "АШ резерв",
    rightCallsign: "ШТАБ-2 (Центр)*",
  },
];

const unitRows: DualRow[] = [
  {
    leftRole: "Начальник отряда",
    leftCallsign: "ОТРЯД-1",
    rightRole: "Заместитель начальника отряда по ОТР - начальник ЦОУ",
    rightCallsign: "ОТРЯД-2",
  },
  {
    leftRole: "Заместитель нач. отряда по ИР и КО",
    leftCallsign: "ОТРЯД-4",
    rightRole: "Начальник службы МТОиО",
    rightCallsign: "ОТРЯД-5",
  },
  {
    leftRole: "Начальник дежурной смены ПАСО",
    leftCallsign: "Лидер",
    rightRole: "Начальник службы СПСР",
    rightCallsign: "Пламя",
  },
  {
    leftRole: "Командир пожарно-спасательной службы",
    leftCallsign: "Пламя-1",
    rightRole: "",
    rightCallsign: "",
  },
  {
    leftRole: "Начальник службы ХРЗ",
    leftCallsign: "Химик",
    rightRole: "",
    rightCallsign: "",
  },
  {
    leftRole: "Инженер службы ХРЗ",
    leftCallsign: "Химик-1",
    rightRole: "Начальник ВСС",
    rightCallsign: "Водолаз",
  },
  {
    leftRole: "Отделение службы ХРЗ",
    leftCallsign: "Химик-2",
    rightRole: "Отделение ВСС",
    rightCallsign: "Водолаз-1,2,3",
  },
  {
    leftRole: "Автомобиль химической и радиационной защиты АХРЗ",
    leftCallsign: "АХРЗ",
    rightRole: "Автомобиль ВСС",
    rightCallsign: "АВС",
  },
  {
    leftRole: "Начальник медицинской службы",
    leftCallsign: "Медик",
    rightRole: "Автоцистерна",
    rightCallsign: "Цистерна",
  },
  {
    leftRole: "Врач - терапевт",
    leftCallsign: "Медик-1",
    rightRole: "Автомобиль быстрого реагирования АБР",
    rightCallsign: "АБР",
  },
  {
    leftRole: "Отделение медицинской службы",
    leftCallsign: "Медик-2",
    rightRole: "Аварийно спасательный автомобиль АСА",
    rightCallsign: "АСА",
  },
  {
    leftRole: "Автомобиль медицинской службы АМС",
    leftCallsign: "АМС",
    rightRole: "Автомобиль АГДЗС",
    rightCallsign: "Газовка",
  },
];

const unitGroups: CallsignSection["groups"] = [
  {
    id: "units-command",
    title: "Руководство и управление ПАСО",
    subtitle: "Ключевые должности управления отрядом",
    rows: unitRows.slice(0, 3),
  },
  {
    id: "units-hrz",
    title: "Служба ХРЗ",
    subtitle: "Химическая и радиационная защита",
    rows: [unitRows[3], unitRows[6]],
  },
  {
    id: "units-diving",
    title: "Водолазная служба",
    subtitle: "ВСС и отделения",
    rows: [unitRows[4], unitRows[5]],
  },
  {
    id: "units-medicine",
    title: "Медики и оперативная техника",
    subtitle: "Медицинская служба и основные автомобили подразделения",
    rows: [unitRows[7], unitRows[8], unitRows[9], unitRows[10]],
  },
];

export const CALLSIGN_SECTIONS: CallsignSection[] = [
  {
    id: "command",
    title: "Руководство УМЧС и ЦОУ УМЧС",
    subtitle: "Верхний блок позывных",
    rows: commandRows,
  },
  {
    id: "hq",
    title: "УМЧС (Гомель) / Штаб ЛЧС / ГОЧС (Центр)",
    subtitle: "Штабные позывные",
    rows: hqRows,
  },
  {
    id: "units",
    title: "ПАСО ГОЧС УМЧС и службы",
    subtitle: "",
    rows: unitRows,
    groups: unitGroups,
  },
];

export const CALLSIGN_SECTION_IDS = CALLSIGN_SECTIONS.map((section) => section.id);
