import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NoteSchema, type Note } from "../../src/tools/recipe-notes/data";
import { addNote, buildNote, cleanLine, normaliseTag, parseTags, serializeNotes, slugify, today, uniqueId, validateNote } from "./notes.mjs";
import raw from "../../src/tools/recipe-notes/notes.json";

const NOW = new Date(2026, 10, 20, 18, 0);
const good = () =>
  buildNote({ title: "Chicken & Squash Saagwala", tags: "Curry, Slow Cooker", ingredients: "- Chicken\n2. Squash", method: ["Roast"] }, [], NOW);

describe("notes helpers", () => {
  it("slugifies titles and tags", () => {
    expect(slugify("Chicken & Squash Saagwala")).toBe("chicken-and-squash-saagwala");
    expect(slugify("  Crème brûlée!! ")).toBe("creme-brulee");
    expect(normaliseTag("Slow Cooker")).toBe("slow-cooker");
    expect(parseTags("Curry, slow cooker; CURRY,, ")).toEqual(["curry", "slow-cooker"]);
  });

  it("makes ids unique", () => {
    expect(uniqueId("Dal", [])).toBe("dal");
    expect(uniqueId("Dal", ["dal", "dal-2"])).toBe("dal-3");
    expect(uniqueId("!!!", [])).toBe("note");
  });

  it("cleans pasted bullets and numbers", () => {
    expect(cleanLine("  - Roast the squash ")).toBe("Roast the squash");
    expect(cleanLine("3) Stir")).toBe("Stir");
    expect(cleanLine("210°C for 20 minutes")).toBe("210°C for 20 minutes");
  });

  it("formats today in local time", () => {
    expect(today(NOW)).toBe("2026-11-20");
  });

  it("builds a valid note from loose input", () => {
    const n = good();
    expect(n).toMatchObject({ id: "chicken-and-squash-saagwala", added: "2026-11-20", tags: ["curry", "slow-cooker"], ingredients: ["Chicken", "Squash"], method: ["Roast"] });
    expect(validateNote(n)).toEqual([]);
    expect(NoteSchema.safeParse(n).success).toBe(true);
  });

  it("reports what's missing", () => {
    const n = buildNote({ title: "", tags: "", ingredients: "", method: "" }, [], NOW);
    expect(validateNote(n).length).toBeGreaterThanOrEqual(4);
  });

  it("adds newest first and refuses a duplicate id", () => {
    const a = good();
    const b = { ...good(), id: "other" };
    expect(addNote([a], b).map((n: { id: string }) => n.id)).toEqual(["other", a.id]);
    expect(() => addNote([a], a)).toThrow(/already/);
  });

  it("serialises to JSON the site accepts, and round-trips the real file", () => {
    const notes = [good(), ...(raw as Note[])];
    const text = serializeNotes(notes);
    expect(JSON.parse(text)).toEqual(notes);
    // The committed file is already in the script's format, so adding a note only changes that note.
    expect(readFileSync(new URL("../../src/tools/recipe-notes/notes.json", import.meta.url), "utf8")).toBe(serializeNotes(raw as Note[]));
  });
});
