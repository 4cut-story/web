import type { NextRequest } from "next/server";

import { proxyApi } from "@/lib/server/api-proxy";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, { params }: Context) {
  return proxyApi(request, (await params).path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
