import { normalize, singular, wordMatch } from "@/tools/cookbooks/engine";
import { PROTEINS, type Flavour, type Kind, type Region, type Tag } from "./data";

// Words people type → the tags recipes are paired by. Keys are normalised and
// singular (see `words`). A word can point at several tags: "steak" is beef too.
const SYNONYMS: Record<string, Tag[]> = {
  beef: ["beef"], steak: ["steak", "beef"], sirloin: ["steak", "beef"], ribeye: ["steak", "beef"], "rib eye": ["steak", "beef"],
  fillet: ["steak", "beef"], rump: ["steak", "beef"], picanha: ["steak", "beef"], bavette: ["steak", "beef"], flank: ["steak", "beef"],
  skirt: ["steak", "beef"], hanger: ["steak", "beef"], "t bone": ["steak", "beef"], tomahawk: ["steak", "beef"], porterhouse: ["steak", "beef"],
  brisket: ["beef"], mince: ["beef"], burger: ["beef"], "short rib": ["beef"], veal: ["beef"], venison: ["beef"],
  lamb: ["lamb"], mutton: ["lamb"], goat: ["lamb"], chop: ["lamb", "pork"], cutlet: ["lamb", "pork"],
  pork: ["pork"], belly: ["pork"], rib: ["pork", "beef"], sausage: ["pork"], gammon: ["pork"], ham: ["pork"], tenderloin: ["pork"],
  chicken: ["chicken"], thigh: ["chicken"], breast: ["chicken"], drumstick: ["chicken"], wing: ["chicken"], turkey: ["chicken"], poultry: ["chicken"],
  duck: ["duck"], goose: ["duck"],
  fish: ["fish"], salmon: ["salmon", "fish"], trout: ["salmon", "fish"], cod: ["fish"], haddock: ["fish"], hake: ["fish"], "sea bass": ["fish"],
  bass: ["fish"], bream: ["fish"], tuna: ["fish"], mackerel: ["fish"], sardine: ["fish"], halibut: ["fish"], snapper: ["fish"], monkfish: ["fish"],
  seafood: ["seafood"], prawn: ["seafood"], shrimp: ["seafood"], scallop: ["seafood"], squid: ["seafood"], calamari: ["seafood"],
  octopus: ["seafood"], mussel: ["seafood"], crab: ["seafood"], lobster: ["seafood"], clam: ["seafood"],
  tofu: ["tofu"], tempeh: ["tofu"], seitan: ["tofu"],
  egg: ["eggs"], cheese: ["cheese"], halloumi: ["cheese"], paneer: ["cheese"], feta: ["cheese"],
  potato: ["potatoes"], chip: ["potatoes"], mash: ["potatoes"],
  green: ["greens"], broccoli: ["greens"], kale: ["greens"], spinach: ["greens"], cabbage: ["greens"], chard: ["greens"], "green bean": ["greens"],
  bean: ["beans"], asparagus: ["greens"], "bok choy": ["greens"], "pak choi": ["greens"], sprout: ["greens"], lettuce: ["greens"], salad: ["greens"],
  pea: ["greens"], leek: ["greens"], "spring green": ["greens"], cucumber: ["greens"],
  root: ["roots"], carrot: ["roots"], parsnip: ["roots"], beetroot: ["roots"], beet: ["roots"], "sweet potato": ["roots", "squash"],
  turnip: ["roots"], celeriac: ["roots"], swede: ["roots"], onion: ["roots"],
  mushroom: ["mushrooms"], shiitake: ["mushrooms"],
  aubergine: ["aubergine"], eggplant: ["aubergine"], brinjal: ["aubergine"],
  tomato: ["tomatoes"], pepper: ["peppers"], capsicum: ["peppers"],
  courgette: ["courgette"], zucchini: ["courgette"],
  cauliflower: ["cauliflower"], squash: ["squash"], pumpkin: ["squash"], butternut: ["squash"],
  corn: ["corn"], sweetcorn: ["corn"], chickpea: ["beans"], lentil: ["beans"],
  rice: ["rice"], noodle: ["noodles"], pasta: ["noodles"], bread: ["bread"], flatbread: ["bread"], pitta: ["bread"], tortilla: ["bread"],
};

// Cuts that say which animal only when nothing else does: "salmon fillet" is
// fish, "fillet" alone is a steak, "chicken breast" isn't also lamb or pork.
const CUTS = new Set(["fillet", "chop", "cutlet", "rib", "belly", "tenderloin", "thigh", "breast", "drumstick", "wing"]);

const PROTEIN_SET = new Set<Tag>(PROTEINS);
// A protein the recipe goes with matters more than a side: "steak and broccoli"
// should lead with steak sauces, not everything that suits broccoli.
const PROTEIN_WEIGHT = 3;
const SIDE_WEIGHT = 1;
const NAME_WEIGHT = 5;
// Words from the description ("citrusy", "nutty", "smoky") count, but a name
// or cuisine hit still comes first.
const ABOUT_WEIGHT = 2;

const words = (s: string) => normalize(s).split(" ").filter(Boolean).map(singular);

/**
 * Map free text ("beef steak, green beans") to tags plus the words that
 * weren't recognised (which are matched against names, cuisines and
 * descriptions instead).
 * Two-word synonyms ("sweet potato") are tried before single words.
 */
export function parseIngredients(text: string): { tags: Tag[]; rest: string[] } {
  const ws = words(text);
  const tags = new Set<Tag>();
  const cuts = new Set<Tag>();
  const rest: string[] = [];
  for (let i = 0; i < ws.length; i++) {
    const pair = i + 1 < ws.length ? `${ws[i]} ${ws[i + 1]}` : "";
    if (pair && SYNONYMS[pair]) {
      SYNONYMS[pair]!.forEach((t) => tags.add(t));
      i++;
    } else if (SYNONYMS[ws[i]!]) {
      SYNONYMS[ws[i]!]!.forEach((t) => (CUTS.has(ws[i]!) ? cuts : tags).add(t));
    } else if (!["and", "with", "some", "a", "the", "of", "or", "veg", "vegetable", "meat"].includes(ws[i]!)) {
      rest.push(ws[i]!);
    }
  }
  if (![...tags].some((t) => PROTEIN_SET.has(t))) cuts.forEach((t) => tags.add(t));
  return { tags: [...tags], rest };
}

export interface Suggestion {
  flavour: Flavour;
  score: number;
  /** The tags that made it match, for the "Goes with" line. */
  matched: Tag[];
}

export interface Query {
  text: string;
  kind?: Kind;
  region?: Region;
}

/**
 * Rank the library for what's in the fridge. With no text, everything that
 * passes the filters comes back A–Z. Otherwise a recipe needs at least one
 * matching tag or a name/cuisine/description hit; higher scores first, then
 * A–Z.
 */
export function suggest(q: Query, flavours: Flavour[]): Suggestion[] {
  const pool = flavours.filter((f) => (!q.kind || f.kind === q.kind) && (!q.region || f.region === q.region));
  const { tags, rest } = parseIngredients(q.text);
  const byName = (a: Suggestion, b: Suggestion) => a.flavour.name.localeCompare(b.flavour.name);
  if (!tags.length && !rest.length) return pool.map((flavour) => ({ flavour, score: 0, matched: [] })).sort(byName);

  const out: Suggestion[] = [];
  for (const f of pool) {
    const matched = tags.filter((t) => f.pairsWith.includes(t));
    let score = matched.reduce((s, t) => s + (PROTEIN_SET.has(t) ? PROTEIN_WEIGHT : SIDE_WEIGHT), 0);
    if (rest.length) {
      const nameWords = words(`${f.name} ${f.cuisine}`);
      const aboutWords = words(f.about);
      score += rest.reduce((s, w) => s + NAME_WEIGHT * wordMatch(w, nameWords) + ABOUT_WEIGHT * wordMatch(w, aboutWords), 0);
    }
    if (score > 0) out.push({ flavour: f, score, matched });
  }
  return out.sort((a, b) => b.score - a.score || byName(a, b));
}
