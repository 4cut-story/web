import { vi } from "vitest";

type Handler =
  | Response
  | ((
      init: RequestInit | undefined,
      url: string,
    ) => Response | Promise<Response>);

/** "METHOD 경로(앞부분)" → 응답. 먼저 등록한 것이 먼저 맞는다. 맞는 것이 없으면 404. */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ method, url, init });
    for (const [key, handler] of Object.entries(routes)) {
      const [m, prefix] = key.split(" ");
      if (
        m === method &&
        (url === prefix || url.startsWith(prefix) || url.includes(prefix))
      ) {
        return typeof handler === "function"
          ? handler(init, url)
          : handler.clone();
      }
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const noContent = () => new Response(null, { status: 204 });
