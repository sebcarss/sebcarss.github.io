import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
  to: string;
  title: string;
  children: ReactNode;
  external?: boolean;
  emoji?: string;
}

export function Card({ to, title, children, external, emoji }: Props) {
  const body = (
    <>
      <h3>
        {emoji && <span aria-hidden="true">{emoji}</span>} {title}
      </h3>
      <p>{children}</p>
    </>
  );
  if (external || to.startsWith("/music")) {
    return (
      <a className="card" href={to} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>
        {body}
      </a>
    );
  }
  return (
    <Link className="card" to={to}>
      {body}
    </Link>
  );
}
