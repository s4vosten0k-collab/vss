"use client";

import { AssistantChatPanel } from "@/components/assistant-chat-panel";

/** Устаревший вход: откройте чат через плавающую кнопку. */
export function AssistantPage() {
  return <AssistantChatPanel returnTo="/handbook/?tab=docs" />;
}
