/** @vitest-environment jsdom */
import { html } from "@arrow-js/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { Renderer } from "../Renderer.js";
import { createLibrary, defineComponent } from "../library.js";

const TextContent = defineComponent({
  name: "TextContent",
  props: z.object({ text: z.string() }),
  description: "Displays text content",
  component: ({ props }) => html`<span>${props.text}</span>`,
});

const library = createLibrary({
  components: [TextContent],
  root: "TextContent",
});

const VALID_RESPONSE = 'root = TextContent("Hello world")';

describe("Renderer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("mounts without rendering content when response is null", () => {
    const app = document.createElement("div");
    Renderer({ response: null, library })(app);

    expect(app.innerHTML).toBe("");
  });

  it("calls onParseResult with null when response is null", () => {
    const onParseResult = vi.fn();
    const app = document.createElement("div");

    Renderer({ response: null, library, onParseResult })(app);

    expect(onParseResult).toHaveBeenCalledWith(null);
  });

  it("renders a valid openui-lang response", () => {
    const app = document.createElement("div");

    Renderer({ response: VALID_RESPONSE, library })(app);

    expect(app.innerHTML).toContain("Hello world");
  });

  it("calls onParseResult with a ParseResult when given valid openui-lang", () => {
    const onParseResult = vi.fn();
    const app = document.createElement("div");

    Renderer({ response: VALID_RESPONSE, library, onParseResult })(app);

    const result = onParseResult.mock.calls.at(-1)?.[0];
    expect(result).not.toBeNull();
    expect(result?.root?.typeName).toBe("TextContent");
  });
});
