import { promises as fs } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const INDEX_FILE = join(DATA_DIR, "threads.json");

export type IndexedThread = {
  id: string;
  title: string;
  createdAt: string;
};

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, "[]");
  }
}

export async function readIndex(): Promise<IndexedThread[]> {
  await ensureFile();
  const raw = await fs.readFile(INDEX_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(threads: IndexedThread[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(INDEX_FILE, JSON.stringify(threads, null, 2));
}

export async function addThread(thread: IndexedThread): Promise<void> {
  const all = await readIndex();
  all.unshift(thread);
  await writeIndex(all);
}

export async function removeThread(id: string): Promise<void> {
  const all = await readIndex();
  await writeIndex(all.filter((t) => t.id !== id));
}

export async function updateIndexEntry(
  id: string,
  patch: Partial<IndexedThread>,
): Promise<IndexedThread | null> {
  const all = await readIndex();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeIndex(all);
  return all[idx];
}
