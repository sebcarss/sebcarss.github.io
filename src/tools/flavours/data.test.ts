import { describe, expect, it } from "vitest";
import raw from "./flavours.json";
import { FlavourSchema, KINDS, parseFlavours } from "./data";

const list = raw as unknown[];

// A pairing index only: recipe text and links to where it came from must not
// creep back in.
const ALLOWED_KEYS = Object.keys(FlavourSchema.shape);

describe("flavours.json", () => {
  it("every entry is valid", () => {
    list.forEach((r, i) => {
      const res = FlavourSchema.safeParse(r);
      expect(res.success, `#${i} ${(r as { id?: string }).id}: ${JSON.stringify(res.error?.issues[0])}`).toBe(true);
    });
    expect(parseFlavours(list)).toHaveLength(list.length);
  });

  it("ids are unique", () => {
    const ids = parseFlavours(list).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no ingredients, methods or sources", () => {
    for (const r of list as Record<string, unknown>[]) {
      for (const k of Object.keys(r)) expect(ALLOWED_KEYS, `${r.id}: ${k}`).toContain(k);
      expect(JSON.stringify(r), String(r.id)).not.toMatch(/https?:|www\./);
    }
  });

  it("has every kind", () => {
    const all = parseFlavours(list);
    for (const k of KINDS) expect(all.some((f) => f.kind === k), k).toBe(true);
  });

  it("skips a bad entry instead of failing", () => {
    expect(parseFlavours([{ id: "x" }, list[0]])).toHaveLength(1);
    expect(parseFlavours("nope")).toEqual([]);
  });
});
