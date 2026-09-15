import { useEffect, useState, type KeyboardEvent } from "react";
import { round } from "@/lib/math";

interface Props {
  value: number;
  onChange: (v: number) => void;
  /** "input" fires on every keystroke (the % fields); "commit" only on blur/Enter (derived gram fields). */
  mode?: "input" | "commit";
  step?: number | "any";
  min?: number;
  max?: number;
  /** Decimals used when re-formatting the value after editing. */
  dp?: number;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  "aria-label": string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * Controlled number input that keeps its own text while focused, so typing
 * "1." or clearing the field never snaps back to a parsed number mid-edit.
 */
export function NumberInput({ value, onChange, mode = "input", dp = 2, ...rest }: Props) {
  const fmtVal = (v: number) => (Number.isFinite(v) ? String(round(v, dp)) : "");
  const [text, setText] = useState(fmtVal(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(fmtVal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, dp]);

  const commit = () => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && n !== value) onChange(n);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (mode === "input") {
          const n = Number(e.target.value);
          if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
          else if (e.target.value.trim() === "") onChange(0);
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (mode === "commit") commit();
        else setText(fmtVal(value));
      }}
      onKeyDown={onKey}
      {...rest}
    />
  );
}
