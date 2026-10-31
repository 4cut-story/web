import { NextRequest } from "next/server";

import { SESSION_COOKIE, sealSession } from "@/lib/server/session";

export const GW = "http://localhost:8080";

export function loggedIn(
  url: string,
  init: {
    method?: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  } = {},
) {
  const cookie = `${SESSION_COOKIE}=${sealSession({ accessToken: "old", refreshToken: "r1" })}`;
  return new NextRequest(`http://localhost:3000${url}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers: { cookie, ...init.headers },
  });
}

export function anonymous(
  url: string,
  init: {
    method?: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  } = {},
) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers: init.headers,
  });
}

export function params<T>(value: T) {
  return { params: Promise.resolve(value) };
}
