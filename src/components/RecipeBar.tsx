import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { deleteRecipe, findRecipe, findRecipeByName, saveRecipe, useRecipes, type SavedRecipe } from "@/lib/recipes/store";
import { metaKey, type DraftMeta } from "@/lib/recipes/draft";
import { readJSON, writeJSON } from "@/lib/storage";
import { copyText, shareText, canShare } from "@/lib/export/share";
import type { Tool } from "@/lib/ingredients";
import { Panel } from "./Panel";

const MetaSchema = z.object({
  recipeId: z.string().optional(),
  name: z.string().default(""),
  notes: z.string().default(""),
});

interface Props<S> {
  tool: Tool;
  title: string;
  schema: number;
  state: S;
  /** Parse a stored state (possibly from an older schema); null if unusable. */
  parse: (state: unknown, schema: number) => S | null;
  onLoad: (state: S) => void;
  onNew?: () => void;
  toText: (state: S, name: string, notes: string) => string;
  summary: (state: S) => string;
}

/**
 * Name / notes / save / share for one tool. The current recipe id, name and
 * notes are kept in localStorage next to the draft so they survive reloads.
 */
export function RecipeBar<S>({ tool, title, schema, state, parse, onLoad, onNew, toText, summary }: Props<S>) {
  const recipes = useRecipes<S>(tool);
  const [meta, setMeta] = useState<DraftMeta>(() => readJSON(metaKey(tool), MetaSchema, { name: "", notes: "" }));
  const [flash, setFlash] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    writeJSON(metaKey(tool), meta);
  }, [meta, tool]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  const currentName = meta.name.trim();

  const doSave = (asNew: boolean) => {
    if (!currentName) {
      nameRef.current?.focus();
      setFlash("Give the recipe a name first.");
      return;
    }
    let id: string | undefined = asNew ? undefined : meta.recipeId;
    if (id && !findRecipe(id)) id = undefined;
    const clash = findRecipeByName<S>(tool, currentName);
    if (clash && clash.id !== id) {
      if (!confirm(`A recipe called "${clash.name}" already exists. Replace it?`)) return;
      id = clash.id;
    }
    const rec = saveRecipe<S>({ id, tool, name: currentName, notes: meta.notes, schema, state });
    setMeta((m) => ({ ...m, recipeId: rec.id }));
    setFlash(id ? "Saved." : "Saved as a new recipe.");
  };

  const load = (r: SavedRecipe<S>) => {
    const s = parse(r.state, r.schema);
    if (!s) {
      alert("This recipe was saved by a version this app can't read.");
      return;
    }
    setMeta({ recipeId: r.id, name: r.name, notes: r.notes });
    onLoad(s);
    setFlash(`Loaded "${r.name}".`);
  };

  const remove = (r: SavedRecipe<S>) => {
    if (!confirm(`Delete recipe "${r.name}"?`)) return;
    deleteRecipe(r.id);
    if (meta.recipeId === r.id) setMeta((m) => ({ ...m, recipeId: undefined }));
  };

  const text = () => toText(state, currentName || "Untitled recipe", meta.notes);

  const share = async () => {
    const outcome = await shareText(`${currentName || title}`, text());
    setFlash(outcome === "shared" ? "Shared." : outcome === "copied" ? "Copied to clipboard." : "");
  };

  const copy = async () => {
    setFlash((await copyText(text())) ? "Copied to clipboard." : "Couldn't copy.");
  };

  const sorted = [...recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Panel title="Recipe">
      <div className="save-form">
        <input
          ref={nameRef}
          type="text"
          placeholder="Recipe name"
          aria-label="Recipe name"
          value={meta.name}
          onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
        />
        <button type="button" className="btn btn-primary" onClick={() => doSave(false)}>
          Save
        </button>
        {meta.recipeId && (
          <button type="button" className="btn" onClick={() => doSave(true)}>
            Save as new
          </button>
        )}
        {onNew && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMeta({ name: "", notes: "" });
              onNew();
            }}
          >
            New
          </button>
        )}
      </div>
      <textarea
        aria-label="Notes"
        placeholder="Notes — method, timings, what to change next time. Included when you share."
        value={meta.notes}
        onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
        style={{ marginTop: "0.5rem" }}
      />
      <div className="recipe-bar no-print">
        <button type="button" className="btn" onClick={() => void share()}>
          {canShare() ? "Share…" : "Share (copy)"}
        </button>
        <button type="button" className="btn" onClick={() => void copy()}>
          Copy text
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print
        </button>
        {flash && (
          <span className="flash" role="status">
            {flash}
          </span>
        )}
      </div>
      {sorted.length > 0 ? (
        <ul className="list">
          {sorted.map((r) => (
            <li key={r.id} className={r.id === meta.recipeId ? "current" : ""}>
              <span>
                {r.name} <span className="meta">{safeSummary(r, parse, summary)}</span>
              </span>
              <span className="btns">
                <button type="button" className="btn" onClick={() => load(r)}>
                  Load
                </button>
                <button type="button" className="btn" onClick={() => remove(r)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">No saved recipes yet. Recipes are stored on this device; back them up from the Food page.</p>
      )}
    </Panel>
  );
}

function safeSummary<S>(r: SavedRecipe<S>, parse: Props<S>["parse"], summary: Props<S>["summary"]) {
  try {
    const s = parse(r.state, r.schema);
    return s ? summary(s) : "(unreadable)";
  } catch {
    return "(unreadable)";
  }
}
