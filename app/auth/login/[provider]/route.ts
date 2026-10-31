import type { NextRequest } from "next/server";

import { forwardOAuth } from "@/lib/server/oauth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  return forwardOAuth(request, "login", (await params).provider);
}
