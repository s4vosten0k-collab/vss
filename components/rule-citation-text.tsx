import { cn } from "@/lib/utils";
import { splitRuleCitation } from "@/lib/rule-citation";

type RuleCitationTextProps = {
  text: string;
  className?: string;
  mainClassName?: string;
  citationClassName?: string;
};

/**
 * Текст вопроса/пояснения: ссылка на пункт в конце (в скобках) выделяется отдельным блоком.
 */
export function RuleCitationText({ text, className, mainClassName, citationClassName }: RuleCitationTextProps) {
  const { main, citation } = splitRuleCitation(text);
  if (!citation) {
    return <span className={cn(className, mainClassName)}>{text}</span>;
  }

  return (
    <span className={className}>
      <span className={mainClassName}>{main}</span>
      <span
        className={cn(
          "mt-1.5 block w-full max-w-full rounded-md border border-primary/45 bg-primary/10 px-2 py-1.5 text-[11px] font-medium leading-snug text-primary/95 shadow-[0_0_0_1px_rgba(249,115,22,0.08)] [overflow-wrap:anywhere] sm:text-xs",
          citationClassName,
        )}
      >
        ({citation})
      </span>
    </span>
  );
}
