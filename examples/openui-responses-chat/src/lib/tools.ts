import type { FunctionTool } from "openai/resources/responses/responses";

export const tools: FunctionTool[] = [
  {
    type: "function",
    name: "get_weather",
    description: "Get current weather for a location.",
    parameters: {
      type: "object",
      properties: { location: { type: "string", description: "City name" } },
      required: ["location"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "get_stock_price",
    description: "Get stock price for a ticker symbol.",
    parameters: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Ticker symbol, e.g. AAPL" },
      },
      required: ["symbol"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "calculate",
    description: "Evaluate a math expression.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression to evaluate" },
      },
      required: ["expression"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "search_web",
    description: "Search the web for information.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Search query" } },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "create_code_artifact",
    description:
      "Render a code snippet artifact for the user. Use this whenever the user asks for code.",
    parameters: {
      type: "object",
      // Property order is preserved by strict mode; keep `code` last so the
      // frontend can extract earlier fields (language, title) from partial
      // streaming JSON before `code` is complete.
      properties: {
        language: {
          type: "string",
          description: "Language identifier (e.g. 'python', 'typescript', 'rust').",
        },
        title: {
          type: "string",
          description: "Short title for the artifact.",
        },
        code: {
          type: "string",
          description: "The code content.",
        },
      },
      required: ["language", "title", "code"],
      additionalProperties: false,
    },
    strict: true,
  },
];

type ToolImpl = (args: Record<string, unknown>) => Promise<unknown>;

const knownTemps: Record<string, number> = {
  tokyo: 22,
  "san francisco": 18,
  london: 14,
  "new york": 25,
  paris: 19,
  sydney: 27,
  mumbai: 33,
  berlin: 16,
};
const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear Skies"];

const knownPrices: Record<string, number> = {
  AAPL: 189.84,
  GOOGL: 141.8,
  TSLA: 248.42,
  MSFT: 378.91,
  AMZN: 178.25,
  NVDA: 875.28,
  META: 485.58,
};

export const toolImpls: Record<string, ToolImpl> = {
  get_weather: async ({ location }) => {
    const loc = String(location ?? "");
    const temp = knownTemps[loc.toLowerCase()] ?? Math.floor(Math.random() * 30 + 5);
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return {
      location: loc,
      temperature_celsius: temp,
      temperature_fahrenheit: Math.round(temp * 1.8 + 32),
      condition,
      humidity_percent: Math.floor(Math.random() * 40 + 40),
      wind_speed_kmh: Math.floor(Math.random() * 25 + 5),
      forecast: [
        { day: "Tomorrow", high: temp + 2, low: temp - 4, condition: "Partly Cloudy" },
        { day: "Day After", high: temp + 1, low: temp - 3, condition: "Sunny" },
      ],
    };
  },

  get_stock_price: async ({ symbol }) => {
    const s = String(symbol ?? "").toUpperCase();
    const price = knownPrices[s] ?? Math.floor(Math.random() * 500 + 20);
    const change = parseFloat((Math.random() * 8 - 4).toFixed(2));
    return {
      symbol: s,
      price: parseFloat((price + change).toFixed(2)),
      change,
      change_percent: parseFloat(((change / price) * 100).toFixed(2)),
      volume: `${(Math.random() * 50 + 10).toFixed(1)}M`,
      day_high: parseFloat((price + Math.abs(change) + 1.5).toFixed(2)),
      day_low: parseFloat((price - Math.abs(change) - 1.2).toFixed(2)),
    };
  },

  calculate: async ({ expression }) => {
    const expr = String(expression ?? "");
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%\s,Math.sqrtpowabsceilfloorround]/g, "");
      const result = new Function(`return (${sanitized})`)();
      return { expression: expr, result: Number(result) };
    } catch {
      return { expression: expr, error: "Invalid expression" };
    }
  },

  search_web: async ({ query }) => {
    const q = String(query ?? "");
    return {
      query: q,
      results: [
        {
          title: `Top result for "${q}"`,
          snippet: `Comprehensive overview of ${q} with the latest information.`,
        },
        {
          title: `${q} - Latest News`,
          snippet: `Recent developments and updates related to ${q}.`,
        },
        {
          title: `Understanding ${q}`,
          snippet: `An in-depth guide explaining everything about ${q}.`,
        },
      ],
    };
  },

  // No-op: the artifact lives entirely in the tool-call args. The frontend
  // renders from streaming args; this echo is just a marker for the LLM that
  // the artifact was delivered.
  create_code_artifact: async (args) => ({ ok: true, ...args }),
};

export async function executeTool(name: string, args: string): Promise<string> {
  const impl = toolImpls[name];
  if (!impl) return JSON.stringify({ error: `Tool '${name}' not implemented` });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(args);
  } catch {
    return JSON.stringify({ error: "Invalid arguments JSON" });
  }
  const result = await impl(parsed);
  return typeof result === "string" ? result : JSON.stringify(result);
}
