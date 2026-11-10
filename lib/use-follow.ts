"use client";

import { useState } from "react";

import { api } from "./api";
import type { FollowStats } from "./types";
import { useLoad } from "./use-load";

/** 한 사용자의 팔로우 숫자. 팔로우·취소는 FollowButton이 하고, 바뀐 결과를 set·fail로 알려 준다. */
export function useFollow(userId: string) {
  const stats = useLoad(`stats:${userId}`, () =>
    api.get<FollowStats>(`/follows/${userId}/stats`),
  );
  const [error, setError] = useState<string>();

  /** 팔로우 버튼(FollowButton)이 바꾼 뒤 숫자를 맞춘다. */
  function set(following: boolean) {
    setError(undefined);
    const s = stats.data;
    if (!s || s.followedByMe === following) {
      return;
    }
    stats.setData({
      ...s,
      followedByMe: following,
      followers: s.followers + (following ? 1 : -1),
    });
  }

  return {
    stats: stats.data,
    set,
    reload: stats.reload,
    fail: setError,
    error,
  };
}
