import { readFileSync } from "fs";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { join } from "path";
import { executeTool, tools } from "@/lib/tools";

const systemPrompt = readFileSync(
  join(process.cwd(), "src/generated/system-prompt.txt"),
  "utf-8",
);

const MODEL = "gpt-5.4";
const MAX_TOOL_TURNS = 5;

export async function POST(req: NextRequest) {
  const { input, threadId } = (await req.json()) as {
    input: ResponseInputItem[];
    threadId?: string;
  };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const encoder = new TextEncoder();
  let controllerClosed = false;

  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* already closed */
        }
      };
      const close = () => {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        let nextInput: ResponseInputItem[] = input;

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const stream = await client.responses.create({
            model: MODEL,
            instructions: systemPrompt,
            input: nextInput,
            conversation: threadId,
            tools,
            stream: true,
          });

          let lastResponse: ResponseStreamEvent extends infer E
            ? E extends { type: "response.completed"; response: infer R }
              ? R
              : never
            : never = null as never;

          for await (const event of stream) {
            enqueue(`data: ${JSON.stringify(event)}\n\n`);
            if (event.type === "response.completed") {
              lastResponse = event.response as typeof lastResponse;
            }
          }

          const fnCalls: ResponseFunctionToolCall[] = (lastResponse?.output ?? []).filter(
            (o): o is ResponseFunctionToolCall => o.type === "function_call",
          );

          if (fnCalls.length === 0) break;

          const outputs: ResponseInputItem[] = [];
          for (const fc of fnCalls) {
            const result = await executeTool(fc.name, fc.arguments);

            // OpenAI doesn't echo function_call_output items in the response
            // stream — it absorbs them into the conversation silently. Inject
            // a synthetic OpenAI-shape event so the SDK adapter can surface
            // the tool result to the live store (mirrors a real
            // `response.output_item.added` for a function_call_output item).
            enqueue(
              `data: ${JSON.stringify({
                type: "response.output_item.added",
                item: {
                  id: `fco_${fc.call_id}`,
                  type: "function_call_output",
                  call_id: fc.call_id,
                  output: result,
                  status: "completed",
                },
                output_index: 0,
                sequence_number: 0,
              })}\n\n`,
            );

            outputs.push({
              type: "function_call_output",
              call_id: fc.call_id,
              output: result,
            });
          }
          nextInput = outputs;
        }

        enqueue("data: [DONE]\n\n");
        close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        console.error("Responses route error:", msg);
        enqueue(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
        close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
