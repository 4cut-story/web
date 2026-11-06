import type { Concept } from "@/lib/types";
import { CONCEPTS } from "@/lib/recording";
import { cn } from "@/lib/utils";

/** 그림체 고르기(만들기·샘플 화면 공통). */
export function ConceptPicker({
  value,
  onChange,
}: {
  value: Concept;
  onChange: (concept: Concept) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <p id="concept-label" className="text-left text-sm font-medium">
        그림체
      </p>
      <div
        role="radiogroup"
        aria-labelledby="concept-label"
        className="grid w-full grid-cols-2 gap-2"
      >
        {CONCEPTS.map(({ value: v, label }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "h-11 rounded-lg text-sm font-medium",
              value === v
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
