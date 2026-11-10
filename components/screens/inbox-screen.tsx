"use client";

import { MeRedirect } from "@/components/screens/me-screen";

/** 메뉴의 스토리 탭(/comics). 내 스토리 주소(/@아이디)로 보낸다. */
export function InboxScreen() {
  return <MeRedirect to="story" />;
}
