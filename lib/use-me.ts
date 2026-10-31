"use client";

import { api } from "./api";
import type { Me } from "./types";
import { useLoad } from "./use-load";

export function useMe() {
  return useLoad("me", () => api.get<Me>("/me"));
}
