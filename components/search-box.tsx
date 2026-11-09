import { Search } from "lucide-react";

/** 돋보기 아이콘이 붙은 검색 칸. 엔터를 누르면 onSubmit을 부른다. */
export function SearchBox({
  label,
  placeholder = label,
  maxLength,
  value,
  onChange,
  onSubmit,
}: {
  label: string;
  placeholder?: string;
  maxLength: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-10 text-base"
      />
    </form>
  );
}
