"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api, errorMessage, navigation } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * 팔로우 버튼 (002 FR-017·FR-018). 누르면 바로 팔로우하거나 취소한다(승인 없음).
 * 로그인하지 않았으면(signedIn=false) 로그인 화면으로 보낸다. 실패하면 원래 상태로 되돌린다.
 */
export function FollowButton({
  userId,
  following,
  signedIn = true,
  size = "default",
  className,
  onChange,
  onError,
}: {
  userId: string;
  following: boolean;
  signedIn?: boolean;
  /** sm은 작성자 줄·목록 줄처럼 좁은 자리에 쓴다. */
  size?: "sm" | "default";
  className?: string;
  /** 바뀐 뒤(성공했을 때) 새 상태. 숫자를 함께 고칠 때 쓴다. */
  onChange?: (following: boolean) => void;
  /** 실패했을 때 오류 문구. 화면에 보여 줄 곳이 있으면 쓴다. */
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(following);
  const [failed, setFailed] = useState(false);
  // 부모가 새 값을 주면 따라간다 (목록을 다시 받은 경우)
  const [prev, setPrev] = useState(following);
  if (prev !== following) {
    setPrev(following);
    setState(following);
  }

  async function toggle() {
    if (!signedIn) {
      navigation.toLogin();
      return;
    }
    const next = !state;
    setBusy(true);
    setState(next);
    setFailed(false);
    try {
      await (next
        ? api.put(`/follows/${userId}`)
        : api.del(`/follows/${userId}`));
      onChange?.(next);
    } catch (e) {
      setState(!next);
      setFailed(true);
      onError?.(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const Icon = state ? UserCheck : UserPlus;
  return (
    <Button
      type="button"
      size={size}
      variant={state ? "secondary" : "default"}
      aria-pressed={state}
      disabled={busy}
      title={failed ? "다시 눌러 주세요" : undefined}
      onClick={toggle}
      className={cn("shrink-0", className)}
    >
      <Icon aria-hidden />
      {state ? "팔로우 중" : "팔로우"}
    </Button>
  );
}
