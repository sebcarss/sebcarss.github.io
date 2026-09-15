import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main>
      <section className="notfound">
        <h1>404</h1>
        <p>That page doesn't exist.</p>
        <p>
          <Link to="/">Back to the homepage</Link>
        </p>
      </section>
    </main>
  );
}
