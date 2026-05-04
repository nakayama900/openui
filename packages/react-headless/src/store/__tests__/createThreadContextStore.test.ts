import { describe, expect, it } from "vitest";
import { createThreadContextStore } from "../createThreadContextStore";

describe("createThreadContextStore", () => {
  it("has correct initial state", () => {
    const store = createThreadContextStore();
    const state = store.getState();

    expect(state.apps).toEqual({});
    expect(state.artifacts).toEqual({});
  });

  describe("registerApp", () => {
    it("adds a new entry", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "Q4" });

      expect(store.getState().apps).toEqual({
        "app-1": [{ id: "app-1", version: 1, heading: "Q4" }],
      });
    });

    it("adds multiple versions sorted ascending by version", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 3, heading: "v3" });
      store.getState().registerApp({ id: "app-1", version: 1, heading: "v1" });
      store.getState().registerApp({ id: "app-1", version: 2, heading: "v2" });

      expect(store.getState().apps["app-1"]).toEqual([
        { id: "app-1", version: 1, heading: "v1" },
        { id: "app-1", version: 2, heading: "v2" },
        { id: "app-1", version: 3, heading: "v3" },
      ]);
    });

    it("groups separate ids in their own buckets", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "A" });
      store.getState().registerApp({ id: "app-2", version: 1, heading: "B" });

      expect(Object.keys(store.getState().apps).sort()).toEqual(["app-1", "app-2"]);
    });

    it("updates heading when same (id, version) re-registers with different heading", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "Old" });
      store.getState().registerApp({ id: "app-1", version: 1, heading: "New" });

      expect(store.getState().apps["app-1"]).toEqual([{ id: "app-1", version: 1, heading: "New" }]);
    });

    it("is referentially stable when same (id, version, heading) re-registers", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "A" });
      const before = store.getState().apps;

      store.getState().registerApp({ id: "app-1", version: 1, heading: "A" });
      const after = store.getState().apps;

      expect(after).toBe(before);
    });
  });

  describe("unregisterApp", () => {
    it("removes the matching version", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "v1" });
      store.getState().registerApp({ id: "app-1", version: 2, heading: "v2" });
      store.getState().unregisterApp("app-1", 1);

      expect(store.getState().apps["app-1"]).toEqual([{ id: "app-1", version: 2, heading: "v2" }]);
    });

    it("removes the bucket when last version is removed", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "v1" });
      store.getState().unregisterApp("app-1", 1);

      expect(store.getState().apps).toEqual({});
    });

    it("is referentially stable when version does not exist", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "v1" });
      const before = store.getState().apps;

      store.getState().unregisterApp("app-1", 99);

      expect(store.getState().apps).toBe(before);
    });

    it("is referentially stable when id does not exist", () => {
      const store = createThreadContextStore();

      const before = store.getState().apps;

      store.getState().unregisterApp("missing", 1);

      expect(store.getState().apps).toBe(before);
    });
  });

  describe("registerArtifact / unregisterArtifact", () => {
    it("manages artifacts independently from apps", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "App" });
      store.getState().registerArtifact({ id: "art-1", version: 1, heading: "Artifact" });

      expect(store.getState().apps["app-1"]?.length).toBe(1);
      expect(store.getState().artifacts["art-1"]?.length).toBe(1);

      store.getState().unregisterArtifact("art-1", 1);

      expect(store.getState().apps["app-1"]?.length).toBe(1);
      expect(store.getState().artifacts).toEqual({});
    });
  });

  describe("reset", () => {
    it("clears apps and artifacts", () => {
      const store = createThreadContextStore();

      store.getState().registerApp({ id: "app-1", version: 1, heading: "A" });
      store.getState().registerArtifact({ id: "art-1", version: 1, heading: "B" });

      store.getState().reset();

      expect(store.getState().apps).toEqual({});
      expect(store.getState().artifacts).toEqual({});
    });
  });
});
