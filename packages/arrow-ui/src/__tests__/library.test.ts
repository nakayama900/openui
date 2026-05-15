import { describe, expect, it } from "vitest";
import { arrowComponents, openuiLibrary } from "../index.js";

describe("openuiLibrary", () => {
  it("registers the default Arrow UI components", () => {
    expect(arrowComponents.map((component) => component.name)).toEqual([
      "TextContent",
      "Button",
      "Stack",
      "Card",
    ]);
    expect(Object.keys(openuiLibrary.components)).toEqual([
      "TextContent",
      "Button",
      "Stack",
      "Card",
    ]);
    expect(openuiLibrary.root).toBe("Card");
  });

  it("generates a prompt that includes Arrow UI components", () => {
    const prompt = openuiLibrary.prompt();

    expect(prompt).toContain("TextContent");
    expect(prompt).toContain("Card");
  });
});
