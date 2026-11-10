"use client";

import { useState } from "react";

import { api, errorMessage } from "./api";
import type { FollowStats } from "./types";
import { useLoad } from "./use-load";

/** 한 사용자의 팔로우 숫자와 팔로우·취소. 스토리 머리와 프로필이 함께 쓴다. */
export function useFollow(userId: string) {
  const stats = useLoad(`stats:${userId}`, () =>
    api.get<FollowStats>(`/follows/${userId}/stats`),
  );
  const [error, setError] = useState<string>();

  async function toggle() {
    const s = stats.data;
    if (!s) {
      return;
    }
    try {
      await (s.followedByMe
        ? api.del(`/follows/${userId}`)
        : api.put(`/follows/${userId}`));
      stats.setData({
        ...s,
        followedByMe: !s.followedByMe,
        followers: s.followers + (s.followedByMe ? -1 : 1),
      });
      setError(undefined);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return { stats: stats.data, toggle, error };
}
