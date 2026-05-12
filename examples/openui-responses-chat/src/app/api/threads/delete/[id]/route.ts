import OpenAI from "openai";
import { removeThread } from "@/lib/thread-index";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    await client.conversations.delete(id);
  } catch (e) {
    console.warn("Failed to delete OpenAI conversation; removing from index anyway:", e);
  }
  await removeThread(id);

  return new Response(null, { status: 204 });
}
