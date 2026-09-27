import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { FLAVOURS, KINDS, REGIONS, type Kind, type Region } from "./data";
import { suggest, type Suggestion } from "./engine";

const KIND_LABEL: Record<Kind, string> = { rub: "Rubs", marinade: "Marinades", sauce: "Sauces" };
// One tap adds (or removes) a common ingredient from the box.
const QUICK = ["Steak", "Chicken", "Pork", "Lamb", "Salmon", "Prawns", "Tofu", "Potatoes", "Greens", "Mushrooms", "Cauliflower"];

function hasWord(text: string, word: string) {
  return text.split(/\s*,\s*|\s+/).some((w) => w.toLowerCase() === word.toLowerCase());
}

function toggleWord(text: string, word: string): string {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  const without = parts.filter((p) => p.toLowerCase() !== word.toLowerCase());
  return (without.length === parts.length ? [...parts, word.toLowerCase()] : without).join(", ");
}

function Card({ s }: { s: Suggestion }) {
  const f = s.flavour;
  return (
    <li className="flavour">
      <span className="name">{f.name}</span>
      <span className="meta">
        {f.cuisine}
        {f.heat ? <span aria-label={`heat ${f.heat} of 3`}> · {"🌶".repeat(f.heat)}</span> : null}
      </span>
      <span className="about">{f.about}</span>
      <span className="note">
        Goes with {f.pairsWith.map((t) => (s.matched.includes(t) ? <strong key={t}>{t} </strong> : t + " "))}
        {f.cooking && <> · {f.cooking.join(", ")}</>}
      </span>
    </li>
  );
}

export function Flavours() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const kindParam = params.get("kind");
  const kind = (KINDS as readonly string[]).includes(kindParam ?? "") ? (kindParam as Kind) : undefined;
  const regionParam = params.get("region");
  const region = (REGIONS as readonly string[]).includes(regionParam ?? "") ? (regionParam as Region) : undefined;

  const results = useMemo(() => suggest({ text: q, kind, region }, FLAVOURS), [q, kind, region]);
  const groups = KINDS.filter((k) => !kind || k === kind).map((k) => ({ kind: k, items: results.filter((s) => s.flavour.kind === k) }));

  // Typing replaces the history entry rather than adding one per keystroke.
  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <ToolPage
      emoji="🌶️"
      title="Flavour Library"
      blurb="Which rubs, marinades and sauces from around the world go with what you're cooking. Say what you've got (a steak and some greens, say) and get ideas to look up."
    >
      <Panel title="What have you got?">
        <div className="params">
          <label className="wide">
            Ingredients, or a sauce or cuisine
            <input
              type="search"
              aria-label="Ingredients"
              placeholder="e.g. beef steak, broccoli"
              value={q}
              onChange={(e) => set("q", e.target.value)}
              autoFocus
            />
          </label>
        </div>
        <div className="chips" role="group" aria-label="Quick add">
          {QUICK.map((w) => (
            <button key={w} type="button" className="chip" aria-pressed={hasWord(q, w)} onClick={() => set("q", toggleWord(q, w))}>
              {w}
            </button>
          ))}
        </div>
        <div className="filters">
          <Toggle
            label="Kind"
            value={kind ?? "all"}
            onChange={(v) => set("kind", v === "all" ? undefined : v)}
            options={[{ value: "all", label: "All" }, ...KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
          />
          <select aria-label="Region" value={region ?? ""} onChange={(e) => set("region", e.target.value || undefined)}>
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <p className="note">
          {FLAVOURS.length} rubs, marinades and sauces. Look up a recipe for any of them yourself.
        </p>
      </Panel>

      {results.length === 0 ? (
        <Panel>
          <p className="note">Nothing matches. Try a main ingredient like “chicken” or “lamb”, or clear the filters.</p>
        </Panel>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <Panel key={g.kind} title={`${KIND_LABEL[g.kind]} (${g.items.length})`}>
              <ul className="list flavours">
                {g.items.map((s) => (
                  <Card key={s.flavour.id} s={s} />
                ))}
              </ul>
            </Panel>
          ))
      )}
    </ToolPage>
  );
}
