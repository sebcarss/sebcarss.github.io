import { describe, expect, it } from "vitest";
import raw from "./notes.json";
import { NoteSchema, TAG_RE, allTags, parseNotes } from "./data";

const list = raw as unknown[];

describe("notes.json", () => {
  it("every entry is valid", () => {
    list.forEach((r, i) => {
      const res = NoteSchema.safeParse(r);
      expect(res.success, `#${i} ${(r as { id?: string }).id}: ${JSON.stringify(res.error?.issues[0])}`).toBe(true);
    });
    expect(parseNotes(list)).toHaveLength(list.length);
  });

  it("ids are unique and tags are lowercase kebab-case without duplicates", () => {
    const notes = parseNotes(list);
    expect(new Set(notes.map((n) => n.id)).size).toBe(notes.length);
    for (const n of notes) {
      expect(new Set(n.tags).size, n.id).toBe(n.tags.length);
      n.tags.forEach((t) => expect(t, n.id).toMatch(TAG_RE));
    }
  });

  it("skips bad entries instead of crashing", () => {
    expect(parseNotes([{ id: "x" }, null, ...list])).toHaveLength(list.length);
    expect(parseNotes("nope")).toEqual([]);
  });

  it("allTags counts notes per tag, most used first", () => {
    const mk = (id: string, tags: string[]) => ({ id, title: id, added: "2026-01-01", tags, ingredients: ["a"], method: ["b"] });
    expect(allTags([mk("a", ["curry", "chicken"]), mk("b", ["curry"])])).toEqual([
      { tag: "curry", count: 2 },
      { tag: "chicken", count: 1 },
    ]);
  });
});
