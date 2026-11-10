"use client";

import { AppShell, HOME, LoginButton } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import type { Tab } from "@/components/main-nav";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { useViewer } from "@/lib/use-me";

/**
 * 사용자 주소(/@아이디, /@아이디/profile) 화면의 틀. 아이디로 사용자를 찾고, 로그인하지 않았으면 첫 화면 링크와
 * 로그인 버튼을, 주인이면 selfTab 메뉴를 켠다. children은 찾은 사용자, 주인인지, 로그인했는지를 받는다.
 */
export function UserShell({
  nickname,
  title,
  selfTab,
  children,
}: {
  nickname: string;
  title: (user: User | undefined) => string;
  selfTab: Tab;
  children: (user: User, self: boolean, signedIn: boolean) => React.ReactNode;
}) {
  const viewer = useViewer();
  const user = useLoad(`lookup:${nickname}`, () =>
    api.get<User>(`/users/lookup?nickname=${encodeURIComponent(nickname)}`),
  );
  const anonymous = viewer.data === null;
  const self = Boolean(viewer.data && viewer.data.id === user.data?.id);

  return (
    <AppShell
      title={title(user.data)}
      back={anonymous ? HOME : undefined}
      tab={anonymous ? undefined : self ? selfTab : "feed"}
      width="wide"
      actions={anonymous && <LoginButton />}
    >
      {user.error && (
        <ErrorText
          message={
            user.error.code === "NOT_FOUND"
              ? "없는 사용자예요. 주소를 다시 확인해 주세요."
              : user.error.message
          }
          code={user.error.code}
        />
      )}
      {user.data && children(user.data, self, Boolean(viewer.data))}
    </AppShell>
  );
}
