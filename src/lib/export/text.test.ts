import { describe, expect, it } from "vitest";
import { table, joinBlocks, notesBlock } from "./text";

describe("text export helpers", () => {
  it("lays out fixed-width columns", () => {
    const out = table(
      [{ header: "Ingredient" }, { header: "%", dp: 1 }, { header: "g" }],
      [
        ["Water", 35, 350],
        ["Salt", 1.5, 15],
      ],
    );
    expect(out).toBe(["Ingredient     %    g", "Water       35.0  350", "Salt         1.5   15"].join("\n"));
  });

  it("drops empty blocks and indents notes", () => {
    expect(joinBlocks("a", "", null, "b")).toBe("a\n\nb\n");
    expect(notesBlock("  ")).toBe("");
    expect(notesBlock("rest 1 h\nsheet")).toBe("\nNotes\n  rest 1 h\n  sheet");
  });
});
