import { NavLink, Outlet } from "react-router-dom";
import { UpdateToast } from "./UpdateToast";

export function Layout() {
  return (
    <>
      <header className="nav">
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
    </>
  );
}
