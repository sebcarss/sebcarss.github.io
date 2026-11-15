import { describe, expect, it } from "vitest";
import { MODE_INTERVALS, characteristic, degreeLabel, formula, fretboardMap, intervalAt, noteNames, pentatonicDiff, type ModeId } from "./theory";

const IDS = Object.keys(MODE_INTERVALS) as ModeId[];

describe("mode theory", () => {
  it("every mode is a rotation of the major scale", () => {
    const major = MODE_INTERVALS.ionian;
    const order: ModeId[] = ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
    order.forEach((id, k) => {
      const from = major[k]!;
      const rotated = major.map((_, i) => (major[(i + k) % 7]! - from + 12) % 12);
      expect(MODE_INTERVALS[id], id).toEqual(rotated);
    });
  });

  it("writes formulas against the major scale", () => {
    expect(formula("ionian")).toBe("1 2 3 4 5 6 7");
    expect(formula("mixolydian")).toBe("1 2 3 4 5 6 ♭7");
    expect(formula("dorian")).toBe("1 2 ♭3 4 5 6 ♭7");
    expect(formula("lydian")).toBe("1 2 3 ♯4 5 6 7");
    expect(formula("locrian")).toBe("1 ♭2 ♭3 4 ♭5 ♭6 ♭7");
    expect(degreeLabel("dorian", 4)).toBe("");
  });

  it("spells each mode from A with one letter per degree", () => {
    expect(noteNames("ionian")).toEqual(["A", "B", "C♯", "D", "E", "F♯", "G♯"]);
    expect(noteNames("mixolydian")).toEqual(["A", "B", "C♯", "D", "E", "F♯", "G"]);
    expect(noteNames("lydian")).toEqual(["A", "B", "C♯", "D♯", "E", "F♯", "G♯"]);
    expect(noteNames("phrygian")).toEqual(["A", "B♭", "C", "D", "E", "F", "G"]);
    expect(noteNames("locrian")).toEqual(["A", "B♭", "C", "D", "E♭", "F", "G"]);
  });

  it("characteristic notes are in the mode", () => {
    for (const id of IDS) for (const iv of characteristic(id)) expect(MODE_INTERVALS[id], id).toContain(iv);
    expect(characteristic("dorian")).toEqual([9]);
    expect(characteristic("mixolydian")).toEqual([4, 10]);
  });

  it("describes each mode as a pentatonic plus added notes", () => {
    expect(pentatonicDiff("dorian")).toEqual({ base: "minor", added: [2, 9], dropped: [] });
    expect(pentatonicDiff("aeolian")).toEqual({ base: "minor", added: [2, 8], dropped: [] });
    expect(pentatonicDiff("phrygian")).toEqual({ base: "minor", added: [1, 8], dropped: [] });
    expect(pentatonicDiff("mixolydian")).toEqual({ base: "major", added: [5, 10], dropped: [] });
    expect(pentatonicDiff("lydian")).toEqual({ base: "major", added: [6, 11], dropped: [] });
    expect(pentatonicDiff("locrian")).toEqual({ base: "minor", added: [1, 6, 8], dropped: [7] });
  });

  it("maps the neck: roots at the known A positions, added notes flagged", () => {
    expect(intervalAt(6, 5)).toBe(0);
    expect(intervalAt(4, 7)).toBe(0);
    expect(intervalAt(2, 7)).toBe(9);
    const map = fretboardMap("dorian");
    expect(map.filter((c) => c.role === "root").map((c) => `${c.s}/${c.f}`).sort()).toEqual(["1/5", "4/7", "6/5"]);
    const sixth = map.find((c) => c.s === 2 && c.f === 7)!;
    expect(sixth).toMatchObject({ label: "6", role: "added", char: true });
    expect(map.find((c) => c.s === 2 && c.f === 6)).toBeUndefined();
  });
});
