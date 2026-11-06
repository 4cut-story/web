import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTER,
  expressionLabel,
  filterApiPath,
  filterQuery,
  parseFilter,
  profileLine,
  THEMES,
  themeLabel,
} from "./characters";

describe("캐릭터 갤러리 조건", () => {
  it("테마는 자동을 빼고 일곱 가지다", () => {
    expect(THEMES).toHaveLength(7);
    expect(themeLabel("WUXIA")).toBe("무협");
    expect(expressionLabel("SAD")).toBe("슬픔");
  });

  it("주소 쿼리를 풀고 모르는 값은 기본값으로 둔다", () => {
    expect(parseFilter({})).toEqual(DEFAULT_FILTER);
    expect(
      parseFilter({
        theme: "JOSEON",
        job: ["의사", "x"],
        age: "OLD",
        gender: "MALE",
        q: "하늘",
      }),
    ).toEqual({
      theme: "JOSEON",
      job: "의사",
      ageGroup: "OLD",
      gender: "MALE",
      q: "하늘",
    });
    expect(parseFilter({ theme: "MARS", age: "BABY", gender: "X" })).toEqual(
      DEFAULT_FILTER,
    );
  });

  it("조건을 화면 주소와 API 경로로 바꾼다", () => {
    expect(filterQuery(DEFAULT_FILTER)).toBe("");
    const f = {
      theme: "WUXIA" as const,
      job: "의사",
      ageGroup: "YOUNG" as const,
      gender: "FEMALE" as const,
      q: " 하 ",
    };
    expect(filterQuery(f)).toBe(
      "?theme=WUXIA&job=%EC%9D%98%EC%82%AC&age=YOUNG&gender=FEMALE&q=%ED%95%98",
    );
    expect(filterApiPath(f)).toBe(
      "/characters?concept=WUXIA&size=48&job=%EC%9D%98%EC%82%AC&ageGroup=YOUNG&gender=FEMALE&q=%ED%95%98",
    );
    expect(filterApiPath(DEFAULT_FILTER, 10)).toBe(
      "/characters?concept=DAILY&size=10",
    );
  });

  it("아는 정보만 이어 한 줄로 쓴다", () => {
    expect(
      profileLine({ ageGroup: "YOUNG", gender: "FEMALE", job: "의사" }),
    ).toBe("청년 · 여성 · 의사");
    expect(profileLine({ ageGroup: null, gender: null, job: null })).toBe("");
  });
});
