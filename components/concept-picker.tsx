import type { Concept } from "@/lib/types";
import { CONCEPTS } from "@/lib/recording";
import { ChoicePicker } from "@/components/choice-picker";

/** 그림체 고르기(만들기·샘플 화면 공통). */
export function ConceptPicker({
  value,
  onChange,
}: {
  value: Concept;
  onChange: (concept: Concept) => void;
}) {
  return (
    <ChoicePicker
      label="그림체"
      options={CONCEPTS}
      value={value}
      onChange={onChange}
    />
  );
}
