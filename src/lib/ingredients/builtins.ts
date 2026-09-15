import type { Category, Ingredient, Solids, Tool } from "./schema";

/**
 * Built-in ingredient database shared by every food calculator.
 *
 * Every figure is g per 100 g of the ingredient as bought; water is whatever
 * is left (see derive.ts). Sources are typical published compositions
 * (McCance & Widdowson, USDA FoodData Central, manufacturer specs, Corvitto's
 * POD/PAC tables) rounded to the precision that matters for balancing a
 * recipe — treat them as good defaults, not lab results, and add a custom
 * ingredient when you have the real label.
 *
 * Conventions:
 *  - `sugars` are non-lactose sugars; `lactose` is separate so the ice-cream
 *    engine can add its POD/PAC once and check lactose against the water
 *    phase. Dairy MSNF = protein + lactose + ash (derive.ts).
 *  - `sweet.pod/pac` are per 100 g as bought and cover the ingredient's own
 *    sugars/solutes only. Sucrose = 100/100.
 *  - Flours: `protein` and `ash` are the bag figures (as-is, ~14 % moisture).
 *    Their water never counts towards dough hydration.
 *  - Ethanol is neither water nor solid in real life; here it's left in the
 *    water phase and its (large) freezing-point effect carried via `pac`.
 */

type Partial6 = Partial<Solids>;
const S = (p: Partial6): Solids => ({
  fat: p.fat ?? 0,
  protein: p.protein ?? 0,
  sugars: p.sugars ?? 0,
  lactose: p.lactose ?? 0,
  ash: p.ash ?? 0,
  other: p.other ?? 0,
});

const ALL: Tool[] = ["ice-cream", "bread", "ramen"];
const IC: Tool[] = ["ice-cream"];
const ICB: Tool[] = ["ice-cream", "bread"];
const BR: Tool[] = ["bread"];
const BRR: Tool[] = ["bread", "ramen"];

type Extra = Pick<Ingredient, "sweet" | "egg" | "yeast" | "source">;

function ing(
  id: string,
  name: string,
  category: Category,
  tools: Tool[],
  solids: Partial6,
  extra: Extra = {},
): Ingredient {
  return { id, name, category, tools, solids: S(solids), ...extra };
}

const sucrose = (sugars: number) => ({ sweet: { pod: sugars, pac: sugars } });

export const BUILTIN_INGREDIENTS: Ingredient[] = [
  // ---- Liquids ---------------------------------------------------------
  ing("water", "Water", "liquid", ALL, {}),
  ing("coconut-milk", "Coconut milk (17% fat)", "liquid", ICB, { fat: 17, protein: 1.5, sugars: 2, ash: 0.5, other: 1 }, sucrose(2)),
  ing("coconut-cream", "Coconut cream (24% fat)", "liquid", ICB, { fat: 24, protein: 2, sugars: 3, ash: 0.6, other: 1.5 }, sucrose(3)),
  ing("oat-milk", "Oat milk", "liquid", ICB, { fat: 1.5, protein: 1, sugars: 4, ash: 0.4, other: 3 }, { sweet: { pod: 3, pac: 6 } }),
  ing("vodka", "Vodka / spirit (40% ABV)", "liquid", IC, {}, { sweet: { pod: 0, pac: 245 }, source: "ethanol 33 g/100 g, PAC 743 per 100 g ethanol" }),

  // ---- Dairy -----------------------------------------------------------
  ing("whole-milk", "Whole milk", "dairy", ICB, { fat: 3.6, protein: 3.4, lactose: 4.8, ash: 0.7 }),
  ing("semi-skimmed-milk", "Semi-skimmed milk", "dairy", ICB, { fat: 1.8, protein: 3.5, lactose: 4.8, ash: 0.7 }),
  ing("skimmed-milk", "Skimmed milk", "dairy", ICB, { fat: 0.1, protein: 3.5, lactose: 4.9, ash: 0.7 }),
  ing("single-cream", "Single cream (18%)", "dairy", IC, { fat: 18, protein: 2.8, lactose: 4.0, ash: 0.6 }),
  ing("whipping-cream", "Whipping cream (36%)", "dairy", IC, { fat: 36, protein: 2.2, lactose: 3.0, ash: 0.4 }),
  ing("double-cream", "Double cream (48%)", "dairy", IC, { fat: 48, protein: 1.7, lactose: 2.5, ash: 0.4 }),
  ing("creme-fraiche", "Crème fraîche (30%)", "dairy", IC, { fat: 30, protein: 2.4, lactose: 3.4, ash: 0.5 }),
  ing("mascarpone", "Mascarpone", "dairy", IC, { fat: 42, protein: 4.5, lactose: 3.5, ash: 0.5 }),
  ing("cream-cheese", "Cream cheese", "dairy", IC, { fat: 34, protein: 6, lactose: 3, ash: 1 }),
  ing("greek-yoghurt", "Greek yoghurt (10%)", "dairy", ICB, { fat: 10, protein: 5.5, lactose: 3.5, ash: 0.7 }),
  ing("natural-yoghurt", "Natural yoghurt", "dairy", ICB, { fat: 3.5, protein: 4.5, lactose: 4.5, ash: 0.8 }),
  ing("buttermilk", "Buttermilk", "dairy", ICB, { fat: 0.8, protein: 3.4, lactose: 4.5, ash: 0.7 }),
  ing("evaporated-milk", "Evaporated milk", "dairy", IC, { fat: 8, protein: 7, lactose: 10, ash: 1.5 }),
  ing("condensed-milk", "Condensed milk (sweetened)", "dairy", IC, { fat: 8, protein: 7.5, sugars: 45, lactose: 11, ash: 1.5 }, sucrose(45)),
  ing("whole-milk-powder", "Whole milk powder", "dairy", ICB, { fat: 26, protein: 26, lactose: 38, ash: 6 }),
  ing("skimmed-milk-powder", "Skimmed milk powder", "dairy", ICB, { fat: 1, protein: 36, lactose: 52, ash: 8 }),
  ing("whey-powder", "Whey powder", "dairy", IC, { fat: 1, protein: 12, lactose: 73, ash: 8 }),
  ing("butter", "Butter (unsalted)", "dairy", ICB, { fat: 82, protein: 0.6, lactose: 0.6, ash: 0.1 }),
  ing("butter-salted", "Butter (salted)", "dairy", ICB, { fat: 81, protein: 0.6, lactose: 0.6, ash: 1.8 }),
  ing("ghee", "Ghee / clarified butter", "dairy", ICB, { fat: 99.5 }),

  // ---- Sweeteners ------------------------------------------------------
  ing("sugar", "Sugar (white, sucrose)", "sweetener", ICB, { sugars: 100 }, sucrose(100)),
  ing("brown-sugar", "Soft brown sugar", "sweetener", ICB, { sugars: 96, ash: 0.5, other: 1.5 }, { sweet: { pod: 97, pac: 98 } }),
  ing("muscovado", "Muscovado sugar", "sweetener", ICB, { sugars: 93, ash: 1.5, other: 2 }, { sweet: { pod: 95, pac: 100 } }),
  ing("icing-sugar", "Icing sugar", "sweetener", IC, { sugars: 97, other: 3 }, sucrose(97)),
  ing("dextrose", "Dextrose (anhydrous)", "sweetener", IC, { sugars: 100 }, { sweet: { pod: 70, pac: 190 } }),
  ing("dextrose-monohydrate", "Dextrose monohydrate", "sweetener", IC, { sugars: 91 }, { sweet: { pod: 64, pac: 173 } }),
  ing("fructose", "Fructose", "sweetener", IC, { sugars: 100 }, { sweet: { pod: 170, pac: 190 } }),
  ing("lactose-powder", "Lactose powder", "sweetener", IC, { lactose: 100 }, { source: "POD 16 / PAC 100 added by the engine from `lactose`" }),
  ing("invert-sugar", "Invert sugar / trimoline (75% solids)", "sweetener", IC, { sugars: 75 }, { sweet: { pod: 95, pac: 142 } }),
  ing("glucose-syrup-de42", "Glucose syrup DE 42 (80% solids)", "sweetener", IC, { sugars: 80 }, { sweet: { pod: 40, pac: 73 } }),
  ing("glucose-syrup-de60", "Glucose syrup DE 60 (80% solids)", "sweetener", IC, { sugars: 80 }, { sweet: { pod: 56, pac: 92 } }),
  ing("atomised-glucose", "Atomised glucose powder (DE 40)", "sweetener", IC, { sugars: 96 }, { sweet: { pod: 48, pac: 88 } }),
  ing("maltodextrin", "Maltodextrin (DE 18)", "sweetener", IC, { sugars: 95 }, { sweet: { pod: 8, pac: 18 } }),
  ing("trehalose", "Trehalose", "sweetener", IC, { sugars: 90 }, { sweet: { pod: 41, pac: 91 } }),
  ing("honey", "Honey", "sweetener", ICB, { sugars: 80, other: 2 }, { sweet: { pod: 105, pac: 155 } }),
  ing("golden-syrup", "Golden syrup", "sweetener", ICB, { sugars: 80 }, { sweet: { pod: 88, pac: 120 } }),
  ing("maple-syrup", "Maple syrup", "sweetener", ICB, { sugars: 67, ash: 0.5, other: 0.5 }, { sweet: { pod: 68, pac: 70 } }),
  ing("agave-syrup", "Agave syrup", "sweetener", ICB, { sugars: 76 }, { sweet: { pod: 120, pac: 140 } }),
  ing("malt-syrup", "Barley malt syrup", "sweetener", ICB, { sugars: 78, other: 2 }, { sweet: { pod: 30, pac: 78 } }),
  ing("molasses", "Molasses / black treacle", "sweetener", ICB, { sugars: 60, ash: 5, other: 13 }, { sweet: { pod: 60, pac: 65 } }),
  ing("glycerol", "Glycerol (glycerine)", "sweetener", IC, { other: 100 }, { sweet: { pod: 60, pac: 372 } }),
  ing("sorbitol", "Sorbitol", "sweetener", IC, { other: 100 }, { sweet: { pod: 60, pac: 188 } }),

  // ---- Eggs ------------------------------------------------------------
  ing("egg-whole", "Whole egg", "egg", ALL, { fat: 10, protein: 12.5, sugars: 0.7, ash: 1, other: 0.3 }, { egg: { wholeEq: 1, colour: 0.35 } }),
  ing("egg-yolk", "Egg yolk", "egg", ALL, { fat: 28, protein: 16, sugars: 0.6, ash: 1.7, other: 2 }, { egg: { wholeEq: 2.0, colour: 1.0 } }),
  ing("egg-white", "Egg white", "egg", ALL, { fat: 0.2, protein: 10.9, sugars: 0.7, ash: 0.6 }, { egg: { wholeEq: 0.5, colour: 0 } }),
  ing("dried-egg-yolk", "Dried egg yolk powder", "egg", ALL, { fat: 56, protein: 32, sugars: 1, ash: 3.5, other: 3 }, { egg: { wholeEq: 3.9, colour: 2.2 } }),
  ing("dried-whole-egg", "Dried whole egg powder", "egg", ALL, { fat: 41, protein: 47, sugars: 2.5, ash: 4, other: 1 }, { egg: { wholeEq: 3.9, colour: 1.4 } }),

  // ---- Fats & oils -----------------------------------------------------
  ing("olive-oil", "Olive oil", "fat", BR, { fat: 100 }),
  ing("vegetable-oil", "Vegetable / rapeseed oil", "fat", BRR, { fat: 100 }),
  ing("sesame-oil", "Sesame oil", "fat", BRR, { fat: 100 }),
  ing("lard", "Lard", "fat", BRR, { fat: 99.5 }),
  ing("shortening", "Vegetable shortening", "fat", BR, { fat: 100 }),
  ing("coconut-oil", "Coconut oil", "fat", ICB, { fat: 100 }),
  ing("cocoa-butter", "Cocoa butter", "fat", IC, { fat: 100 }),

  // ---- Flours (protein/ash as on the bag, ~14% moisture) ---------------
  ing("strong-white-flour", "Strong white bread flour", "flour", BRR, { fat: 1.4, protein: 12.7, sugars: 1.5, ash: 0.55, other: 70 }),
  ing("very-strong-flour", "Very strong Canadian flour", "flour", BRR, { fat: 1.4, protein: 14.5, sugars: 1.5, ash: 0.6, other: 68 }),
  ing("plain-flour", "Plain / all-purpose flour", "flour", BRR, { fat: 1.2, protein: 10.5, sugars: 1.5, ash: 0.45, other: 72.5 }),
  ing("00-flour", "00 flour", "flour", BRR, { fat: 1.2, protein: 12.5, sugars: 1.5, ash: 0.55, other: 70.5 }),
  ing("t55-flour", "French T55", "flour", BRR, { fat: 1.2, protein: 10.5, sugars: 1.5, ash: 0.55, other: 72.5 }),
  ing("t65-flour", "French T65", "flour", BRR, { fat: 1.3, protein: 11, sugars: 1.5, ash: 0.65, other: 71.5 }),
  ing("wholemeal-flour", "Wholemeal (zenryūfun)", "flour", BRR, { fat: 2.2, protein: 13.5, sugars: 2, ash: 1.6, other: 66.5 }),
  ing("rye-light", "Light rye flour", "flour", BRR, { fat: 1.3, protein: 8.5, sugars: 1, ash: 0.8, other: 74.5 }),
  ing("rye-wholegrain", "Wholegrain / dark rye flour", "flour", BRR, { fat: 1.7, protein: 9, sugars: 1, ash: 1.7, other: 72.5 }),
  ing("spelt-white", "White spelt flour", "flour", BRR, { fat: 1.5, protein: 12.5, sugars: 1.5, ash: 0.7, other: 70 }),
  ing("spelt-wholegrain", "Wholegrain spelt flour", "flour", BRR, { fat: 2.4, protein: 14, sugars: 2, ash: 1.7, other: 66 }),
  ing("semolina", "Semola rimacinata (durum)", "flour", BRR, { fat: 1.1, protein: 12.5, sugars: 1.5, ash: 0.75, other: 70 }),
  ing("kyorikiko", "Kyōrikiko (Japanese strong)", "flour", BRR, { fat: 1.5, protein: 12, sugars: 1.5, ash: 0.4, other: 70.5 }),
  ing("churikiko", "Chūrikiko (Japanese medium)", "flour", BRR, { fat: 1.5, protein: 9.5, sugars: 1.5, ash: 0.4, other: 73 }),
  ing("hakurikiko", "Hakurikiko (Japanese weak/cake)", "flour", BRR, { fat: 1.5, protein: 8, sugars: 1.5, ash: 0.36, other: 74.5 }),
  ing("vital-wheat-gluten", "Vital wheat gluten", "flour", BRR, { fat: 1.5, protein: 75, ash: 0.7, other: 15.8 }),
  ing("potato-starch", "Potato starch", "starch", BRR, { protein: 0.1, ash: 0.3, other: 81.6 }),
  ing("tapioca-starch", "Tapioca starch", "starch", BRR, { protein: 0.1, ash: 0.2, other: 87.7 }),
  ing("corn-starch", "Cornflour / corn starch", "starch", ALL, { protein: 0.3, ash: 0.1, other: 87.6 }),

  // ---- Yeast & leaven --------------------------------------------------
  ing("instant-yeast", "Instant yeast", "yeast", BR, { protein: 40, ash: 5, other: 50 }, { yeast: { instantEq: 1 } }),
  ing("active-dry-yeast", "Active dry yeast", "yeast", BR, { protein: 40, ash: 5, other: 50 }, { yeast: { instantEq: 0.8 } }),
  ing("fresh-yeast", "Fresh yeast", "yeast", BR, { protein: 13, ash: 2, other: 14 }, { yeast: { instantEq: 1 / 3 } }),
  ing("diastatic-malt", "Diastatic malt powder", "other", BR, { fat: 1, protein: 12, sugars: 10, ash: 1.5, other: 68 }, { sweet: { pod: 5, pac: 8 } }),

  // ---- Salt ------------------------------------------------------------
  ing("salt", "Salt", "salt", ALL, { ash: 100 }, { sweet: { pod: 0, pac: 1170 }, source: "NaCl 58.4 g/mol × 2 ions" }),

  // ---- Flavours --------------------------------------------------------
  ing("cocoa-powder", "Cocoa powder (10–12% fat)", "flavour", IC, { fat: 11, protein: 20, sugars: 1, ash: 6, other: 57 }),
  ing("cocoa-powder-22", "Cocoa powder (22% fat)", "flavour", IC, { fat: 22, protein: 19, ash: 6, other: 48 }),
  ing("dark-chocolate-70", "Dark chocolate 70%", "flavour", IC, { fat: 42, protein: 7, sugars: 29, ash: 2, other: 19 }, sucrose(29)),
  ing("milk-chocolate", "Milk chocolate", "flavour", IC, { fat: 32, protein: 7, sugars: 50, lactose: 6, ash: 1.5, other: 2.5 }, sucrose(50)),
  ing("white-chocolate", "White chocolate", "flavour", IC, { fat: 34, protein: 6, sugars: 52, lactose: 6, ash: 1.5 }, sucrose(52)),
  ing("pistachio-paste", "Pistachio paste (100%)", "flavour", IC, { fat: 45, protein: 20, sugars: 7, ash: 3, other: 21 }, sucrose(7)),
  ing("hazelnut-paste", "Hazelnut paste (100%)", "flavour", IC, { fat: 61, protein: 15, sugars: 4, ash: 2, other: 13 }, sucrose(4)),
  ing("peanut-butter", "Peanut butter", "flavour", IC, { fat: 50, protein: 25, sugars: 6, ash: 3, other: 14 }, sucrose(6)),
  ing("almond-paste", "Almond paste (100%)", "flavour", IC, { fat: 50, protein: 21, sugars: 4, ash: 3, other: 17 }, sucrose(4)),
  ing("vanilla-extract", "Vanilla extract", "flavour", IC, { sugars: 1, other: 1 }, { sweet: { pod: 1, pac: 260 }, source: "35% ABV" }),
  ing("espresso", "Espresso coffee", "flavour", IC, { other: 2 }),
  ing("instant-coffee", "Instant coffee", "flavour", IC, { protein: 12, ash: 9, other: 74 }),
  ing("matcha", "Matcha", "flavour", IC, { fat: 5, protein: 30, ash: 6, other: 55 }),
  ing("strawberry-puree", "Strawberry purée", "flavour", IC, { protein: 0.7, sugars: 6, ash: 0.4, other: 2 }, { sweet: { pod: 7, pac: 10 } }),
  ing("raspberry-puree", "Raspberry purée", "flavour", IC, { protein: 1.2, sugars: 5, ash: 0.5, other: 5 }, { sweet: { pod: 6, pac: 9 } }),
  ing("mango-puree", "Mango purée", "flavour", IC, { protein: 0.8, sugars: 14, ash: 0.4, other: 2 }, { sweet: { pod: 15, pac: 20 } }),
  ing("banana", "Banana (ripe, mashed)", "flavour", IC, { protein: 1.1, sugars: 12, ash: 0.8, other: 10 }, { sweet: { pod: 13, pac: 18 } }),
  ing("passion-fruit-puree", "Passion fruit purée", "flavour", IC, { protein: 2, sugars: 11, ash: 0.8, other: 2 }, { sweet: { pod: 12, pac: 18 } }),
  ing("lemon-juice", "Lemon juice", "flavour", IC, { protein: 0.4, sugars: 2.5, ash: 0.3, other: 3 }, { sweet: { pod: 2, pac: 6 } }),

  // ---- Inclusions ------------------------------------------------------
  ing("mixed-seeds", "Mixed seeds", "inclusion", BR, { fat: 40, protein: 20, ash: 4, other: 33 }),
  ing("rolled-oats", "Rolled oats", "inclusion", BR, { fat: 7, protein: 13, sugars: 1, ash: 2, other: 68 }),
  ing("cooked-potato", "Cooked potato (mashed)", "inclusion", BR, { protein: 2, ash: 1, other: 18 }),
  ing("raisins", "Raisins", "inclusion", ICB, { protein: 3, sugars: 65, ash: 2, other: 15 }, { sweet: { pod: 75, pac: 110 } }),

  // ---- Stabilisers & emulsifiers ----------------------------------------
  ing("locust-bean-gum", "Locust bean gum", "stabiliser", IC, { other: 88 }),
  ing("guar-gum", "Guar gum", "stabiliser", IC, { other: 90 }),
  ing("carrageenan", "Carrageenan", "stabiliser", IC, { other: 88 }),
  ing("cmc", "CMC (cellulose gum)", "stabiliser", IC, { other: 92 }),
  ing("lecithin", "Soy lecithin", "stabiliser", IC, { fat: 98 }),
];

export const BUILTIN_BY_ID: ReadonlyMap<string, Ingredient> = new Map(
  BUILTIN_INGREDIENTS.map((i) => [i.id, i]),
);
