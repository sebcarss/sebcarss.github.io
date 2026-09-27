import { useEffect, useReducer } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { EMPTY, Progress, reducer } from "./engine/progress";

export const PROGRESS_KEY = "sc:guitar:progress:v1";

/** Guitar School progress, persisted to localStorage on every change. */
export function useProgress() {
  const [state, dispatch] = useReducer(reducer, undefined, () => readJSON(PROGRESS_KEY, Progress, EMPTY));
  useEffect(() => {
    writeJSON(PROGRESS_KEY, state);
  }, [state]);
  return [state, dispatch] as const;
}
