import type { ReactNode } from "react";

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={"panel" + (className ? " " + className : "")}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Details({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="panel" open={open}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
