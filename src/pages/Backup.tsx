import { useRef, useState } from "react";
import { exportAllRecipes, importRecipesJSON, getRecipes } from "@/lib/recipes/store";
import { shareFile, copyText } from "@/lib/export/share";

/** Export / import of every saved recipe, shown on the Food page. */
export function Backup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const count = getRecipes().length;

  const exportAll = async () => {
    const json = exportAllRecipes();
    const stamp = new Date().toISOString().slice(0, 10);
    await shareFile(`sebs-kitchen-recipes-${stamp}.json`, json);
    setMsg("Backup ready.");
  };

  const copyAll = async () => {
    setMsg((await copyText(exportAllRecipes())) ? "Backup JSON copied." : "Couldn't copy.");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const n = importRecipesJSON(await f.text());
      setMsg(`Imported ${n} recipe${n === 1 ? "" : "s"}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <section className="category">
      <h2>Backup</h2>
      <p className="note" style={{ marginTop: 0 }}>
        {count} saved recipe{count === 1 ? "" : "s"} on this device. Export them as a file to keep a copy or move them to another device.
      </p>
      <div className="actions" style={{ marginTop: "0.5rem" }}>
        <button type="button" className="btn" onClick={() => void exportAll()}>
          Export all…
        </button>
        <button type="button" className="btn" onClick={() => void copyAll()}>
          Copy JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import…
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        {msg && <span className="flash">{msg}</span>}
      </div>
    </section>
  );
}
