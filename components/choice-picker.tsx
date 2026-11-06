import { useId } from "react";
import { cn } from "@/lib/utils";

/** 라벨 붙은 선택 버튼 묶음(그림체·사투리 고르기 공통). */
export function ChoicePicker<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  const labelId = useId();
  return (
    <div className="flex w-full flex-col gap-3">
      <p id={labelId} className="text-left text-sm font-medium">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={cn(
          "grid w-full gap-2",
          columns === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {options.map(({ value: v, label: text }) => (
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
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
