import { createLibrary, type ComponentGroup } from "@openuidev/arrow-lang";
import { arrowComponents } from "./components.js";

export const arrowComponentGroups: ComponentGroup[] = [
  {
    name: "Content",
    components: ["TextContent", "Card"],
    notes: ["Use Card to group related text and controls."],
  },
  {
    name: "Layout",
    components: ["Stack"],
    notes: ["Use Stack with direction row for horizontal layouts and column for vertical layouts."],
  },
  {
    name: "Actions",
    components: ["Button"],
    notes: ["Use Button for simple user actions."],
  },
];

export const openuiLibrary = createLibrary({
  components: arrowComponents,
  root: "Card",
  componentGroups: arrowComponentGroups,
});

export const openuiChatLibrary = openuiLibrary;
