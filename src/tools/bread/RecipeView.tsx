import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { fmt } from "@/lib/math";
import { readJSON } from "@/lib/storage";
import { metaKey } from "@/lib/recipes/draft";
import type { BreadResult } from "./engine";
import type { BreadState } from "./state";
import { recipeSteps, showGrams } from "./steps";

const MetaSchema = z.object({ name: z.string().default(""), notes: z.string().default("") }).passthrough();

/** Keep the phone awake while the recipe is open (silently does nothing where unsupported). */
function useWakeLock() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const request = async () => {
      try {
        const l = await navigator.wakeLock.request("screen");
        if (done) void l.release();
        else lock = l;
      } catch {
        /* denied, or the tab is hidden */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** The recipe as something to follow at the bench: numbered steps, big numbers, tick boxes. */
export function RecipeView({ state, r }: { state: BreadState; r: BreadResult | null }) {
  useWakeLock();
  const meta = useMemo(() => readJSON(metaKey("bread"), MetaSchema, { name: "", notes: "" }), []);
  const steps = useMemo(() => (r ? recipeSteps(state, r) : []), [state, r]);
  // Ticks reset whenever the amounts change.
  const signature = JSON.stringify(steps.map((s) => s.rows.map((row) => [row.name, row.shown])));
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  useEffect(() => setTicked(new Set()), [signature]);
  const toggle = (id: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (!r) return <p className="note">Set a flour weight to see the recipe.</p>;
  const problems = [...r.problems, ...(r.pref?.problems ?? [])];

  return (
    <div className="recipe-view">
      <header className="recipe-head">
        <h2>{meta.name.trim() || "Bread"}</h2>
        <p>
          {fmt(r.totalG)} g dough
          {state.mode === "target" ? ` · ${fmt(state.loaves)} × ${fmt(state.loafWeight)} g` : ""} · {fmt(r.flourG)} g flour in total
        </p>
      </header>
      {r.missing.length > 0 && <p className="warn">⚠ Unknown ingredient{r.missing.length > 1 ? "s" : ""}: {r.missing.join(", ")} — not counted.</p>}
      {problems.map((p) => (
        <p key={p} className="warn">⚠ {p}.</p>
      ))}
      <ol className="steps">
        {steps.map((step, si) => (
          <li key={step.key} className="panel step">
            <h3>
              <span className="num" aria-hidden="true">{si + 1}</span>
              <span className="title">{step.title}</span>
              <span className="step-total">{fmt(step.total)} g</span>
            </h3>
            <ul className="checklist">
              {step.rows.map((row, ri) => {
                const id = `${step.key}:${ri}`;
                const on = ticked.has(id);
                return (
                  <li key={id} className={on ? "done" : ""}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                      <span className="name">{row.name}</span>
                      <span className="g">{showGrams(row)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {step.hint && <p className="hint">{step.hint}</p>}
          </li>
        ))}
      </ol>
      {meta.notes.trim() && (
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Notes</h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{meta.notes}</p>
        </section>
      )}
    </div>
  );
}
