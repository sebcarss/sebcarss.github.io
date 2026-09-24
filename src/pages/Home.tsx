import { Card } from "@/components/Card";
import { FOOD_CARDS } from "./Food";

export function Home() {
  return (
    <main>
      <section className="intro">
        <h1>Hi, I'm Seb.</h1>
        <p>A home for the little utilities I build for the things I love.</p>
      </section>

      <section className="category">
        <h2>
          <span aria-hidden="true">🎵</span> Music
        </h2>
        <div className="cards">
          <Card to="/music/tab-caster/" title="Tab Caster" emoji="🎸">
            Turn an Ultimate Guitar PDF into a single-screen tab you can cast to a TV.
          </Card>
          <Card to="/music/scale-charts/" title="Scale Charts" emoji="🎹">
            Notes and chords for every scale degree in every key, with chord progressions highlighted — sized to cast to a TV.
          </Card>
        </div>
      </section>

      <section className="category">
        <h2>
          <span aria-hidden="true">🍜</span> Food
        </h2>
        <div className="cards">{FOOD_CARDS}</div>
      </section>
    </main>
  );
}
