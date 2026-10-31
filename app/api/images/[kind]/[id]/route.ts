import type { NextRequest } from "next/server";

import { proxyImage } from "@/lib/server/images";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  return proxyImage(request, kind, id);
}
