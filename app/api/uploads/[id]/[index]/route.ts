import type { NextRequest } from "next/server";

import { uploadChunk } from "@/lib/server/uploads";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  return uploadChunk(request, id, index);
}
