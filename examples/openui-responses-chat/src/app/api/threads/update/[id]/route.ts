import { NextRequest } from "next/server";
import OpenAI from "openai";
import { updateIndexEntry } from "@/lib/thread-index";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const updates = (await req.json()) as { title?: string };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (typeof updates.title === "string") {
    await client.conversations.update(id, { metadata: { title: updates.title } });
  }

  const updated = await updateIndexEntry(id, { title: updates.title });
  return Response.json(updated ?? { id, ...updates });
}
