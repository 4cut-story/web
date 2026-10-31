import { Awaited } from "@/components/awaited";
import { LoginScreen } from "@/components/screens/login-screen";

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Awaited
      value={searchParams}
      render={(q) => (
        <LoginScreen
          error={typeof q.error === "string" ? q.error : undefined}
        />
      )}
    />
  );
}
