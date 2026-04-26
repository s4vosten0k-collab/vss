/**
 * Выделяет в конце строки ссылку на пункт / приложение ЕПБТ в скобках, чтобы
 * визуально не сливалась с формулировкой вопроса или пояснения.
 */

function isRuleCitationInner(inner: string): boolean {
  const s = inner.trim();
  if (!s) return false;
  if (s.includes("Единых правил")) return true;
  if (s.includes("к ЕПБТ")) return true;
  if (/\bп\./u.test(s) && (s.includes("ЕПБТ") || s.includes("Приложение"))) return true;
  if (/^Приложение\s/u.test(s) && s.includes("ЕПБТ")) return true;
  return false;
}

/** Извлекает последнюю «группу в скобках» с конца строки (с учётом вложенности). */
function extractLastParentGroup(text: string): { before: string; inner: string } | null {
  if (!text.endsWith(")")) return null;
  const closeIdx = text.length - 1;
  let depth = 0;
  for (let j = closeIdx; j >= 0; j -= 1) {
    const c = text[j];
    if (c === ")") depth += 1;
    else if (c === "(") {
      depth -= 1;
      if (depth === 0) {
        return { before: text.slice(0, j), inner: text.slice(j + 1, closeIdx) };
      }
    }
  }
  return null;
}

export function splitRuleCitation(text: string): { main: string; citation: string | null } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { main: text, citation: null };
  }

  let t = trimmed;
  if (t.endsWith(".")) {
    t = t.slice(0, -1).trimEnd();
  }

  const group = extractLastParentGroup(t);
  if (!group) {
    return { main: text, citation: null };
  }

  if (!isRuleCitationInner(group.inner)) {
    return { main: text, citation: null };
  }

  const main = group.before.replace(/\s+$/u, "");
  return { main, citation: group.inner };
}
