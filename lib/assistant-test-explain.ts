/** Тот же URL, что и у чата Павлика — иначе на проде прокси/хост отдают 404 на отдельный путь. */
export function getAssistantApiUrl(): string {
  return process.env.NEXT_PUBLIC_ASSISTANT_API_URL?.trim() ?? "http://127.0.0.1:8787/assistant";
}

export type TestExplainPayload = {
  question: string;
  options: string[];
  correctIndices: number[];
  selectedIndices: number[];
  note?: string;
};

export type TestExplainResponse = {
  answer: string;
  fallback?: boolean;
  warning?: string;
};

export async function fetchTestWrongExplain(
  payload: TestExplainPayload,
  signal?: AbortSignal,
): Promise<TestExplainResponse> {
  const res = await fetch(getAssistantApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "test_explain", ...payload }),
    signal,
  });
  const j = (await res.json()) as TestExplainResponse & { error?: string };
  if (!res.ok) {
    throw new Error(j.error || `Сервер: ${res.status}`);
  }
  if (!j.answer) {
    throw new Error(j.error || "Пустой ответ пояснения");
  }
  return j;
}
