import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAppRendererRegistry, lookupAppRenderer } from "../AppRenderersContext";
import { defineAppRenderer } from "../appRendererTypes";

const makeRenderer = (toolName: string | RegExp, label = String(toolName)) =>
  defineAppRenderer({
    toolName,
    parser: () => ({ label }),
    meta: (props) => ({ id: props.label, version: 1, heading: props.label }),
    preview: () => null,
    actual: () => null,
  });

describe("buildAppRendererRegistry", () => {
  it("returns an empty registry for an empty input", () => {
    const registry = buildAppRendererRegistry([]);

    expect(registry.literal.size).toBe(0);
    expect(registry.regex).toEqual([]);
  });

  it("indexes literal toolNames in the map", () => {
    const r1 = makeRenderer("presentation:create");
    const r2 = makeRenderer("report:create");

    const registry = buildAppRendererRegistry([r1, r2]);

    expect(registry.literal.size).toBe(2);
    expect(registry.literal.get("presentation:create")).toBe(r1);
    expect(registry.literal.get("report:create")).toBe(r2);
    expect(registry.regex).toEqual([]);
  });

  it("collects regex toolNames in the regex array", () => {
    const r1 = makeRenderer(/^presentation:/);
    const r2 = makeRenderer(/^report:/);

    const registry = buildAppRendererRegistry([r1, r2]);

    expect(registry.literal.size).toBe(0);
    expect(registry.regex).toEqual([r1, r2]);
  });

  it("first-wins on duplicate literal toolName", () => {
    const r1 = makeRenderer("presentation:create", "first");
    const r2 = makeRenderer("presentation:create", "second");

    const registry = buildAppRendererRegistry([r1, r2]);

    expect(registry.literal.get("presentation:create")).toBe(r1);
    expect(registry.literal.size).toBe(1);
  });

  describe("dev-mode warnings", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("warns when a duplicate literal toolName is dropped", () => {
      buildAppRendererRegistry([
        makeRenderer("presentation:create"),
        makeRenderer("presentation:create"),
      ]);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain("presentation:create");
    });

    it("does not warn when duplicate is on a regex toolName", () => {
      buildAppRendererRegistry([makeRenderer(/^presentation:/), makeRenderer(/^presentation:/)]);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe("lookupAppRenderer", () => {
  it("returns the literal match when present", () => {
    const r = makeRenderer("presentation:create");
    const registry = buildAppRendererRegistry([r]);

    expect(lookupAppRenderer(registry, "presentation:create")).toBe(r);
  });

  it("returns null when no renderer matches", () => {
    const registry = buildAppRendererRegistry([makeRenderer("presentation:create")]);

    expect(lookupAppRenderer(registry, "report:create")).toBeNull();
  });

  it("falls back to regex match when no literal match", () => {
    const r = makeRenderer(/^presentation:/);
    const registry = buildAppRendererRegistry([r]);

    expect(lookupAppRenderer(registry, "presentation:edit")).toBe(r);
  });

  it("prefers literal match over regex match", () => {
    const literalRenderer = makeRenderer("presentation:create", "literal");
    const regexRenderer = makeRenderer(/^presentation:/, "regex");
    const registry = buildAppRendererRegistry([literalRenderer, regexRenderer]);

    expect(lookupAppRenderer(registry, "presentation:create")).toBe(literalRenderer);
  });

  it("uses array order for regex matches (first wins)", () => {
    const first = makeRenderer(/^presentation:/, "first");
    const second = makeRenderer(/.*:create$/, "second");
    const registry = buildAppRendererRegistry([first, second]);

    // Both regexes match — suppress the dev-mode ambiguity warning here;
    // ambiguity warnings are tested in their own describe block below.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(lookupAppRenderer(registry, "presentation:create")).toBe(first);
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe("dev-mode ambiguity warnings", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("warns when both a literal and a regex match the same tool name", () => {
      const registry = buildAppRendererRegistry([
        makeRenderer("presentation:create"),
        makeRenderer(/^presentation:/),
      ]);

      lookupAppRenderer(registry, "presentation:create");

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain("presentation:create");
    });

    it("warns when multiple regexes match the same tool name", () => {
      const registry = buildAppRendererRegistry([
        makeRenderer(/^presentation:/),
        makeRenderer(/.*:create$/),
      ]);

      lookupAppRenderer(registry, "presentation:create");

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("does not warn when only one renderer matches", () => {
      const registry = buildAppRendererRegistry([
        makeRenderer("presentation:create"),
        makeRenderer(/^report:/),
      ]);

      lookupAppRenderer(registry, "presentation:create");

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
