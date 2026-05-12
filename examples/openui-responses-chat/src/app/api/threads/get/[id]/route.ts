import OpenAI from "openai";
import type { ConversationItem } from "openai/resources/conversations/items";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const items: ConversationItem[] = [];
  for await (const item of client.conversations.items.list(id, {
    limit: 100,
    order: "asc",
  })) {
    items.push(item);
  }

  return Response.json(items);
}
