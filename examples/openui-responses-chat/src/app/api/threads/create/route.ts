import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { addThread } from "@/lib/thread-index";

function extractFirstUserText(items: ResponseInputItem[]): string {
  for (const item of items) {
    const i = item as { type?: string; role?: string; content?: unknown };
    if (i.type === "message" && i.role === "user") {
      if (typeof i.content === "string") return i.content;
      if (Array.isArray(i.content)) {
        for (const part of i.content as Array<{ type: string; text?: string }>) {
          if (part.type === "input_text" && part.text) return part.text;
        }
      }
    }
  }
  return "New conversation";
}

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: ResponseInputItem[] };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const conversation = await client.conversations.create({});

  const title = extractFirstUserText(messages).slice(0, 60);
  const thread = {
    id: conversation.id,
    title,
    createdAt: new Date(conversation.created_at * 1000).toISOString(),
  };

  await addThread(thread);
  return Response.json(thread);
}
