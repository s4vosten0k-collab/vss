import { diverMedicineBlocks } from "@/lib/diver-medicine-data";

/**
 * Все значения `[id]`, с которыми строятся HTML при `output: "export"`.
 * Дубли в кириллице и в encodeURIComponent: браузер/прокси может отдать путь в любом виде, а Next
 * сопоставляет сегмент буквально с `generateStaticParams`.
 */
export function allMedicinePathParams(): { id: string }[] {
  const out: { id: string }[] = [];
  const seen = new Set<string>();
  for (const b of diverMedicineBlocks) {
    for (const id of [b.id, encodeURIComponent(b.id)] as const) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id });
    }
  }
  return out;
}

/**
 * Ссылка на статью: кириллица в пути (короче; совпадает с первым вариантом из `allMedicinePathParams`).
 */
export function medicineBlockHref(id: string) {
  return `/handbook/medicine/${id}/`;
}

export function parseMedicinePathId(paramId: string) {
  try {
    return decodeURIComponent(paramId);
  } catch {
    return paramId;
  }
}
