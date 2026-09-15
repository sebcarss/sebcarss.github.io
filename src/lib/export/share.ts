/** Web Share (iOS share sheet → Notes) with clipboard fallback. */
export const canShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export async function shareText(title: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (canShare()) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      // User cancelled the sheet — not an error worth surfacing.
      if ((e as DOMException)?.name === "AbortError") return "failed";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function shareFile(name: string, text: string, type = "application/json") {
  const file = new File([text], name, { type });
  if (canShare() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
