import { describe, expect, it } from "vitest";
import type { Note } from "./data";
import { searchNotes } from "./engine";

const note = (o: Partial<Note> & { id: string }): Note => ({
  title: o.id,
  added: "2026-01-01",
  tags: ["misc"],
  ingredients: ["salt"],
  method: ["cook"],
  ...o,
});

const NOTES = [
  note({ id: "saag", title: "Chicken & Squash Saagwala", added: "2026-11-20", tags: ["curry", "chicken"], ingredients: ["Spinach", "Crown Prince squash"], method: ["Roast the squash"] }),
  note({ id: "ramen", title: "Crème Ramen", added: "2026-10-01", tags: ["noodles"], ingredients: ["Chicken thighs"], method: ["Simmer the broth"] }),
  note({ id: "salad", title: "Squash salad", added: "2026-12-01", tags: ["salad"], ingredients: ["Squash"], method: ["Toss"] }),
];
const ids = (text: string, tags: string[] = []) => searchNotes({ text, tags }, NOTES).map((h) => h.note.id);

describe("searchNotes", () => {
  it("lists everything newest first with no text", () => {
    expect(ids("")).toEqual(["salad", "saag", "ramen"]);
  });

  it("requires every selected tag", () => {
    expect(ids("", ["curry"])).toEqual(["saag"]);
    expect(ids("", ["curry", "noodles"])).toEqual([]);
  });

  it("matches words in ingredients and method, ignoring plurals", () => {
    expect(ids("spinach")).toEqual(["saag"]);
    expect(ids("squashes")).toContain("saag");
    expect(ids("broth")).toEqual(["ramen"]);
  });

  it("needs every word and ranks title hits first", () => {
    expect(ids("squash chicken")).toEqual(["saag"]);
    expect(ids("squash")).toEqual(["salad", "saag"]); // both have it in the title; newer first
  });

  it("ignores accents and case", () => {
    expect(ids("CREME")).toEqual(["ramen"]);
  });

  it("combines text and tags", () => {
    expect(ids("squash", ["salad"])).toEqual(["salad"]);
    expect(ids("squash", ["noodles"])).toEqual([]);
  });
});
