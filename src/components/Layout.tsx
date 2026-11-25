import { useEffect, useRef } from "react";
import { NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { UpdateToast } from "./UpdateToast";

export function Layout() {
  // --nav-h lets sticky bars sit just under the (sticky) nav.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--nav-h", `${el.offsetHeight}px`);
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <header className="nav" ref={nav}>
        <div className="nav-inner">
          <NavLink className="brand" to="/">
            Seb Carss
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/" end>
              Home
            </NavLink>
            {/* The music tools are plain static pages, not routes. */}
            <a href="/music/">Music</a>
            <NavLink to="/food/">Food</NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Seb Carss</span>
          <a href="https://github.com/sebcarss">GitHub</a>
        </div>
      </footer>
      <UpdateToast />
      {/* Back returns to where you were in a list (e.g. the Flavour Library). */}
      <ScrollRestoration />
    </>
  );
}
