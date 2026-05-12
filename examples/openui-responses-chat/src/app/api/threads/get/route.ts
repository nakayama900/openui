import { readIndex } from "@/lib/thread-index";

export async function GET() {
  const threads = await readIndex();
  return Response.json({ threads });
}
