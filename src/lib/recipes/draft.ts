import { useEffect, useReducer, useRef, type Dispatch, type Reducer } from "react";
import type { ZodType } from "zod";
import { readJSON, writeJSON } from "../storage";
import type { Tool } from "../ingredients/schema";

const draftKey = (tool: Tool) => `sc:draft:${tool}`;

/**
 * A reducer whose state is persisted to localStorage (debounced), so a page
 * refresh or a return from the home screen never loses the working recipe.
 * `schema` validates whatever is found under the key; anything invalid falls
 * back to `initial`.
 */
export function useDraft<S, A>(
  tool: Tool,
  reducer: Reducer<S, A>,
  initial: S,
  schema: ZodType<S>,
): [S, Dispatch<A>] {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    readJSON(draftKey(tool), schema, initial),
  );
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => writeJSON(draftKey(tool), state), 250);
    return () => window.clearTimeout(timer.current);
  }, [state, tool]);
  return [state, dispatch];
}

/** Name of the recipe the draft was loaded from, so Save can update it. */
export interface DraftMeta {
  recipeId?: string;
  name: string;
  notes: string;
}
export const metaKey = (tool: Tool) => `sc:draft-meta:${tool}`;
