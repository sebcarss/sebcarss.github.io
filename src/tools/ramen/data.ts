export type Range = readonly [number, number];

// Carbonate content in mmol CO₃²⁻ per gram of dry salt. Every alkali is
// normalised to ALKALI_REF — a 90:10 K₂CO₃:Na₂CO₃ powder — so the forms are
// directly comparable and styles only ever score one number.
export const CARB_K = 1000 / 138.2; // K₂CO₃ → 7.24
export const CARB_NA = 1000 / 105.99; // Na₂CO₃ → 9.43
// Bicarbonate carries a carbonate per 84 g but is a far weaker base; the 0.35
// factor is empirical, matching the "use nearly twice as much" rule.
export const CARB_BICARB = (1000 / 84.01) * 0.35; // → 4.17
export const ALKALI_REF = 0.9 * CARB_K + 0.1 * CARB_NA;

export const KANSUI_FORMS = {
  none: { label: "no alkali", solids: 1, ratio: false, conc: false, fixedK: null as number | null, bicarb: false },
  powder: { label: "powdered kansui", solids: 1, ratio: true, conc: false, fixedK: null as number | null, bicarb: false },
  liquid: { label: "liquid kansui", solids: null as number | null, ratio: true, conc: true, fixedK: null as number | null, bicarb: false },
  baked: { label: "baked baking soda", solids: 1, ratio: false, conc: false, fixedK: 0 as number | null, bicarb: false },
  bicarb: { label: "sodium bicarbonate", solids: 1, ratio: false, conc: false, fixedK: 0 as number | null, bicarb: true },
} as const;
export type KansuiForm = keyof typeof KANSUI_FORMS;
export const KANSUI_FORM_IDS = Object.keys(KANSUI_FORMS) as KansuiForm[];

// Standard Japanese cutter sizes. Higher number = thinner noodle.
export const CUT_NUMBERS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
export const CRIMPS = ["Straight", "Light wave", "Wavy", "Very wavy"];

// -- The machine on the bench. Swap these two tables for another roller and
// cutter set and the whole equipment reality check follows.

// KitchenAid 5KSMPRA sheet roller. The manual gives each setting a use, never
// a gap — KitchenAid has never published the thicknesses — so the millimetre
// figures are inferred from the manual's own guidance and vary from unit to
// unit. Roll a sheet, measure it with calipers, and edit the mm column here.
export const ROLLER = [
  { setting: 1, mm: 3.0, use: "Kneading, first pass" },
  { setting: 2, mm: 2.4, use: "Kneading and thinning" },
  { setting: 3, mm: 1.9, use: "Thick kluski noodles" },
  { setting: 4, mm: 1.5, use: "Egg noodles" },
  { setting: 5, mm: 1.2, use: "Lasagne, fettuccine, linguine fini" },
  { setting: 6, mm: 0.9, use: "Tortellini, thin fettuccine" },
  { setting: 7, mm: 0.7, use: "Thin fettuccine, fine linguine" },
  { setting: 8, mm: 0.5, use: "Angel hair, capellini" },
] as const;
export type RollerSetting = (typeof ROLLER)[number];
export const DEFAULT_ROLLER_MM = 1.2;

// Cutters actually owned (KitchenAid 5KSMPSA set).
export const OWNED_CUTTERS = [
  { label: "Spaghetti cutter", widthMm: 2.0 },
  { label: "Fettuccine cutter", widthMm: 6.5 },
] as const;
export const cutFor = (widthMm: number) => 30 / widthMm;
export const ownedCutter = (cut: number) => OWNED_CUTTERS.find((c) => Math.abs(cutFor(c.widthMm) - cut) < 0.005);

/** The roller is the only thickness control: snap any mm to the nearest gap. */
export const rollerFor = (mm: number): RollerSetting =>
  Number.isFinite(mm)
    ? ROLLER.reduce((best, s) => (Math.abs(s.mm - mm) < Math.abs(best.mm - mm) ? s : best))
    : ROLLER.find((s) => s.mm === DEFAULT_ROLLER_MM)!;

export const HYDRATION_BANDS = [
  { from: 24, to: 30, label: "Hakata / barikata — sheet-and-fold only" },
  { from: 30, to: 35, label: "Thin tonkotsu & firm shoyu noodles" },
  { from: 35, to: 40, label: "Standard shoyu, shio and chūka soba" },
  { from: 40, to: 46, label: "Miso, Kitakata and other aged noodles" },
  { from: 46, to: 54, label: "Tsukemen & mazesoba — chewy, cold-rinsed" },
] as const;
export const HYDRATION_SCALE: Range = [24, 54];
export const HYDRATION_TICKS = [24, ...HYDRATION_BANDS.map((b) => b.to)];
export const PROTEIN_TARGET: Range = [11, 13];
export const PROTEIN_SCALE: Range = [7, 16];
export const ALKALI_TARGET: Range = [0.8, 1.3];
export const ALKALI_SCALE: Range = [0, 2.5];
export const SALT_TARGET: Range = [1, 2];
export const SALT_SCALE: Range = [0, 4];

// Boil time: t = K · area^0.85 · hydration factor. K is calibrated so a #26 ×
// 1.1 mm noodle at 30 % lands on ~55 s and a #12 × 2.2 mm tsukemen noodle at
// 42 % lands on ~3½ min.
export const COOK_K = 47.3;
export const DONENESS: [string, number][] = [
  ["Katame (firm)", 0.7],
  ["Futsū (normal)", 1.0],
  ["Yawarakame (soft)", 1.35],
];

export const COLOUR_PALE = [232, 226, 210];
export const COLOUR_YELLOW = [240, 196, 25];

export const BROTHS = {
  shio: { label: "Shio", hydration: [33, 40] as Range, cut: [20, 26] as Range, protein: [10.5, 12.5] as Range },
  shoyu: { label: "Shoyu", hydration: [33, 40] as Range, cut: [18, 24] as Range, protein: [11, 13] as Range },
  miso: { label: "Miso", hydration: [36, 44] as Range, cut: [16, 22] as Range, protein: [11, 13] as Range },
  tonkotsu: { label: "Tonkotsu", hydration: [26, 34] as Range, cut: [24, 30] as Range, protein: [11.5, 13.5] as Range },
} as const;
export type Broth = keyof typeof BROTHS;

export interface Style {
  id: string;
  label: string;
  region: string;
  broth: Broth;
  note: string;
  hydration: Range;
  protein: Range;
  alkali: Range;
  salt: Range;
  /** Whole-egg-equivalent % of flour. */
  egg: Range;
  cut: Range;
  thickness: Range;
  crimp: Range;
  aging: Range;
  serving: number;
}

// Every band is [low, high]. crimp is a range of indices into CRIMPS, egg is a
// percentage expressed as whole-egg equivalent, aging is hours.
export const STYLES: Style[] = [
  { id: "hakata", label: "Hakata tonkotsu", region: "Fukuoka", broth: "tonkotsu",
    note: "Ultra-thin straight noodles built for kaedama refills — hydration is kept low so they cook in under a minute and stay firm enough to order barikata.",
    hydration: [26, 32], protein: [11.5, 13.5], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 0], cut: [24, 28], thickness: [0.9, 1.3], crimp: [0, 0], aging: [0, 12], serving: 100 },
  { id: "kurume", label: "Kurume tonkotsu", region: "Fukuoka", broth: "tonkotsu",
    note: "The birthplace of tonkotsu. A fraction thicker and softer than Hakata, under a heavier, longer-boiled broth.",
    hydration: [27, 33], protein: [11.5, 13], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 0], cut: [22, 26], thickness: [1.0, 1.4], crimp: [0, 0], aging: [0, 12], serving: 110 },
  { id: "kumamoto", label: "Kumamoto tonkotsu", region: "Kumamoto", broth: "tonkotsu",
    note: "Noticeably thicker and straighter than the Fukuoka noodles, with the body to stand up to burnt garlic oil (mayu).",
    hydration: [30, 35], protein: [11, 13], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 0], cut: [18, 22], thickness: [1.1, 1.5], crimp: [0, 1], aging: [6, 24], serving: 120 },
  { id: "kagoshima", label: "Kagoshima ramen", region: "Kagoshima", broth: "tonkotsu",
    note: "Unusually low-alkali and soft — closer to a plain Chinese wheat noodle than to the rest of Kyūshū.",
    hydration: [32, 38], protein: [10.5, 12.5], alkali: [0.3, 0.7], salt: [1, 2], egg: [0, 0], cut: [18, 22], thickness: [1.2, 1.6], crimp: [0, 1], aging: [6, 24], serving: 120 },
  { id: "sapporo", label: "Sapporo miso", region: "Hokkaidō", broth: "miso",
    note: "Springy yellow curls with high kansui — engineered to survive the wok and hold a thick, lard-capped miso broth.",
    hydration: [36, 44], protein: [11, 13], alkali: [1.0, 1.5], salt: [1, 2], egg: [0, 8], cut: [18, 22], thickness: [1.3, 1.7], crimp: [2, 3], aging: [24, 72], serving: 140 },
  { id: "asahikawa", label: "Asahikawa shoyu", region: "Hokkaidō", broth: "shoyu",
    note: "Low-hydration wavy noodles that drink up a lard-sealed double soup without going slack in the cold.",
    hydration: [30, 36], protein: [11, 13], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 6], cut: [20, 24], thickness: [1.1, 1.5], crimp: [1, 2], aging: [12, 48], serving: 130 },
  { id: "muroran", label: "Muroran curry", region: "Hokkaidō", broth: "miso",
    note: "Thick wavy noodles under a curry-miso broth — the crimp is doing the work of carrying a heavy, clinging sauce.",
    hydration: [34, 40], protein: [11, 13], alkali: [1.0, 1.4], salt: [1, 2], egg: [0, 8], cut: [18, 22], thickness: [1.2, 1.6], crimp: [2, 3], aging: [12, 48], serving: 140 },
  { id: "hakodate", label: "Hakodate shio", region: "Hokkaidō", broth: "shio",
    note: "Soft, pale, near-straight noodles that deliberately stay out of the way of a very clear salt broth.",
    hydration: [33, 39], protein: [10.5, 12.5], alkali: [0.7, 1.1], salt: [1, 2], egg: [0, 4], cut: [20, 24], thickness: [1.0, 1.4], crimp: [0, 1], aging: [6, 24], serving: 120 },
  { id: "kitakata", label: "Kitakata", region: "Fukushima", broth: "shoyu",
    note: "Flat, wide, heavily crimped and aged for days (熟成) — the widest mainstream ramen noodle in Japan, and eaten for breakfast.",
    hydration: [40, 48], protein: [10.5, 12.5], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 4], cut: [10, 14], thickness: [1.2, 1.6], crimp: [2, 3], aging: [48, 96], serving: 150 },
  { id: "sano", label: "Sano ramen", region: "Tochigi", broth: "shoyu",
    note: "Rolled out under a green bamboo pole (青竹打ち), so the noodles come out irregular, flat and very wavy.",
    hydration: [38, 45], protein: [10, 12], alkali: [0.6, 1.0], salt: [1, 2], egg: [0, 4], cut: [12, 16], thickness: [1.0, 1.6], crimp: [2, 3], aging: [12, 36], serving: 140 },
  { id: "shirakawa", label: "Shirakawa", region: "Fukushima", broth: "shoyu",
    note: "Hand-rolled, flat and wavy like Sano but a touch tighter and more consistent, in a clear soy broth.",
    hydration: [38, 44], protein: [10.5, 12.5], alkali: [0.7, 1.1], salt: [1, 2], egg: [0, 4], cut: [12, 16], thickness: [1.1, 1.5], crimp: [2, 3], aging: [24, 48], serving: 140 },
  { id: "tokyo", label: "Tokyo chūka soba", region: "Tokyo", broth: "shoyu",
    note: "The default ramen noodle — medium-thin, lightly wavy, often with a little egg for colour and richness.",
    hydration: [33, 38], protein: [11, 12.5], alkali: [0.8, 1.2], salt: [1, 2], egg: [2, 10], cut: [20, 24], thickness: [1.1, 1.4], crimp: [1, 2], aging: [12, 36], serving: 120 },
  { id: "ogikubo", label: "Ogikubo", region: "Tokyo", broth: "shoyu",
    note: "A thinner, firmer, higher-alkali take on the Tokyo noodle, from the shops around Ogikubo station.",
    hydration: [32, 37], protein: [11, 13], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 8], cut: [22, 26], thickness: [1.0, 1.3], crimp: [1, 2], aging: [12, 36], serving: 110 },
  { id: "iekei", label: "Yokohama iekei", region: "Kanagawa", broth: "shoyu",
    note: "Short, thick, dead-straight Sakai-style noodles, made to be pulled early (katame) out of a pork-and-soy broth.",
    hydration: [30, 35], protein: [12, 14], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 4], cut: [10, 14], thickness: [1.6, 2.2], crimp: [0, 0], aging: [12, 36], serving: 140 },
  { id: "tsukemen", label: "Tsukemen", region: "Tokyo", broth: "shoyu",
    note: "Very thick, high-hydration and cold-rinsed — hydration does the work here because the noodles are eaten chilled, not sitting in soup.",
    hydration: [42, 50], protein: [12, 14], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 6], cut: [8, 12], thickness: [1.8, 2.6], crimp: [0, 1], aging: [24, 72], serving: 200 },
  { id: "aburasoba", label: "Abura soba / mazesoba", region: "Tokyo", broth: "shoyu",
    note: "Thick chewy noodles with no broth at all — they only ever meet tare and oil, so all the body has to be in the noodle.",
    hydration: [38, 46], protein: [12, 14], alkali: [0.9, 1.4], salt: [1, 2], egg: [0, 6], cut: [10, 14], thickness: [1.5, 2.1], crimp: [1, 2], aging: [24, 48], serving: 160 },
  { id: "nagoya", label: "Nagoya Taiwan ramen", region: "Aichi", broth: "shoyu",
    note: "Medium wavy noodles under a chilli-and-minced-pork topping — the crimp catches the taiwan mince.",
    hydration: [33, 38], protein: [11, 13], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 6], cut: [18, 22], thickness: [1.1, 1.5], crimp: [1, 2], aging: [12, 36], serving: 130 },
  { id: "wakayama", label: "Wakayama chūka soba", region: "Wakayama", broth: "tonkotsu",
    note: "Thin straight noodles in a tonkotsu-shoyu hybrid — Kyūshū thinness with a Kansai soy backbone.",
    hydration: [30, 35], protein: [11, 13], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 4], cut: [22, 26], thickness: [1.0, 1.4], crimp: [0, 1], aging: [6, 24], serving: 110 },
  { id: "tokushima", label: "Tokushima ramen", region: "Tokushima", broth: "tonkotsu",
    note: "Medium-thin, low-alkali and pale, under a sweet-salty pork belly and a raw egg cracked on top.",
    hydration: [30, 36], protein: [11, 13], alkali: [0.6, 1.0], salt: [1, 2], egg: [0, 4], cut: [18, 22], thickness: [1.1, 1.5], crimp: [0, 1], aging: [6, 24], serving: 120 },
  { id: "onomichi", label: "Onomichi ramen", region: "Hiroshima", broth: "shoyu",
    note: "Thin, slightly flat, straight noodles under a soy broth studded with pork back-fat.",
    hydration: [33, 38], protein: [10.5, 12.5], alkali: [0.7, 1.1], salt: [1, 2], egg: [0, 4], cut: [20, 24], thickness: [1.0, 1.3], crimp: [0, 1], aging: [12, 36], serving: 120 },
  { id: "tsubame", label: "Tsubame-Sanjō", region: "Niigata", broth: "shoyu",
    note: "Very thick, almost udon-like noodles in a lard-capped niboshi broth — built for metalworkers' lunches that had to stay hot.",
    hydration: [34, 40], protein: [11.5, 13.5], alkali: [0.9, 1.3], salt: [1, 2], egg: [0, 4], cut: [8, 12], thickness: [1.6, 2.4], crimp: [1, 2], aging: [24, 48], serving: 160 },
  { id: "hiroshima", label: "Hiroshima tsukemen", region: "Hiroshima", broth: "shio",
    note: "Straight noodles served chilled with a chilli-vinegar dipping sauce and raw cabbage — no broth heat to soften them.",
    hydration: [36, 42], protein: [11.5, 13.5], alkali: [0.8, 1.2], salt: [1, 2], egg: [0, 4], cut: [14, 18], thickness: [1.2, 1.8], crimp: [0, 1], aging: [12, 48], serving: 170 },
];
export const styleById = (id: string) => STYLES.find((s) => s.id === id);

export type AttrKey = "hydration" | "width" | "protein" | "thickness" | "alkali" | "crimp" | "egg" | "salt" | "aging";

export interface Attr {
  key: AttrKey;
  label: string;
  unit: string;
  w: number;
  /** Distance outside the band over which the score decays to zero. */
  tol: number;
  dp: number;
}

// Scoring weights and tolerances. Width is scored in millimetres rather than
// cut number, because eight cut numbers is 1.9 mm at #8 but 0.27 mm at #26.
export const ATTRS: Attr[] = [
  { key: "hydration", label: "Effective hydration", unit: "%", w: 3, tol: 8, dp: 1 },
  { key: "width", label: "Width (cut)", unit: " mm", w: 3, tol: 0.6, dp: 2 },
  { key: "protein", label: "Blend protein", unit: "%", w: 2, tol: 2.5, dp: 1 },
  { key: "thickness", label: "Thickness", unit: " mm", w: 2, tol: 0.8, dp: 2 },
  { key: "alkali", label: "Alkali (kansui-eq)", unit: "%", w: 2, tol: 0.6, dp: 2 },
  { key: "crimp", label: "Crimp", unit: "", w: 1, tol: 1.5, dp: 0 },
  { key: "egg", label: "Egg (whole-egg eq)", unit: "%", w: 1, tol: 10, dp: 1 },
  { key: "salt", label: "Salt", unit: "%", w: 1, tol: 1.5, dp: 1 },
  { key: "aging", label: "Aging", unit: " h", w: 0.5, tol: 48, dp: 0 },
];

/** A style's band for an attribute, converting cut numbers to width in mm. */
export function styleBand(style: Style, key: AttrKey): Range {
  if (key === "width") return [30 / style.cut[1], 30 / style.cut[0]];
  return style[key];
}
