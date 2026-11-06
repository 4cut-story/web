import type { Dialect } from "@/lib/types";
import { DIALECTS } from "@/lib/recording";
import { ChoicePicker } from "@/components/choice-picker";

/** 대사 사투리 고르기(만들기·샘플 화면 공통). 고르면 말풍선 대사를 그 사투리로 바꾼다. */
export function DialectPicker({
  value,
  onChange,
}: {
  value: Dialect;
  onChange: (dialect: Dialect) => void;
}) {
  return (
    <ChoicePicker
      label="대사 사투리"
      options={DIALECTS}
      value={value}
      onChange={onChange}
      columns={3}
    />
  );
}
