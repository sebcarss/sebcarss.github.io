import { statusFor, type Status } from "@/components/Meter";
import { round } from "@/lib/math";
import type { BreadResult } from "./engine";
import type { BreadState } from "./state";
import { PROTEIN_TARGET, SALT_TARGET } from "./data";

export type PillKey = "hydration" | "protein" | "salt" | "yeast";

/**
 * The four numbers you watch while tweaking, in one row that sticks under the
 * nav. Tapping one opens that section of the guidance.
 */
export function QuickPills({ state, r, onPick }: { state: BreadState; r: BreadResult | null; onPick: (k: PillKey) => void }) {
  const isLevain = state.pref.type === "levain";
  const pills: { key: PillKey; label: string; value: string; status: Status; title: string }[] = [
    {
      key: "hydration",
      label: "Hydration",
      value: r ? `${round(r.effHydration, 1)}%` : "–",
      status: r && r.hydrationMode === "total" && r.effHydration > state.water + 0.05 ? "high" : "",
      title: r ? `${round(r.addedHydration, 1)}% added water + water in the other ingredients` : "",
    },
    {
      key: "protein",
      label: "Protein",
      value: r ? `${round(r.blendProtein, 1)}%` : "–",
      status: r ? statusFor(round(r.blendProtein, 1), PROTEIN_TARGET) : "",
      title: `Lean bread wants ${PROTEIN_TARGET[0]}–${PROTEIN_TARGET[1]}%`,
    },
    {
      key: "salt",
      label: "Salt",
      value: r ? `${round(state.salt, 1)}%` : "–",
      status: r ? statusFor(round(state.salt, 1), SALT_TARGET) : "",
      title: `Target ${SALT_TARGET[0]}–${SALT_TARGET[1]}%`,
    },
    {
      key: "yeast",
      label: "Yeast",
      value: !r ? "–" : isLevain ? "levain" : `${round(r.yeastInstantEqPct, 2)}%`,
      status: r && !isLevain && r.yeastInstantEqPct === 0 ? "off" : "",
      title: "Instant-yeast equivalent",
    },
  ];
  return (
    <div className="pills no-print" role="group" aria-label="Dough at a glance">
      {pills.map((p) => (
        <button key={p.key} type="button" className={"pill " + p.status} title={p.title} onClick={() => onPick(p.key)}>
          <span className="k">{p.label}</span> <span className="v">{p.value}</span>
        </button>
      ))}
    </div>
  );
}
