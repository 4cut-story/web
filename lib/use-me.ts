"use client";

import { api } from "./api";
import type { Me } from "./types";
import { useLoad } from "./use-load";

/** 로그인한 나. 로그인하지 않았으면 로그인 화면으로 보낸다. */
export function useMe() {
  return useLoad("me", () => api.get<Me>("/me"));
}

/**
 * 지금 보는 사람. 로그인 없이도 열리는 화면(포털, 사용자 페이지, 게시물)에서 쓴다.
 * data가 undefined면 확인 중, null이면 로그인하지 않은 사람이다.
 */
export function useViewer() {
  return useLoad("viewer", () => api.getIfSignedIn<Me>("/me"));
}
