import { useEffect, type ReactNode } from "react";
import "@/styles/tools.css";

export function ToolPage({ emoji, title, blurb, children }: { emoji: string; title: string; blurb: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Seb Carss`;
    return () => {
      document.title = "Seb Carss";
    };
  }, [title]);
  return (
    <main className="wide">
      <section className="intro">
        <h1>
          <span aria-hidden="true">{emoji}</span> {title}
        </h1>
        <p>{blurb}</p>
      </section>
      {children}
    </main>
  );
}
