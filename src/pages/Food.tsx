import { Card } from "@/components/Card";
import { Backup } from "./Backup";
import "@/styles/tools.css";

export const FOOD_CARDS = (
  <>
    <Card to="/food/ice-cream-calculator/" title="Ice Cream Calculator" emoji="🍨">
      Balance fat, sugar and MSNF against ice cream, gelato and sorbet targets to develop new recipes.
    </Card>
    <Card to="/food/bakers-percentage/" title="Baker's Percentage Calculator" emoji="🍞">
      Work out bread doughs in baker's percentages, with hydration guidance and poolish, biga and levain preferments.
    </Card>
    <Card to="/food/ramen-noodles/" title="Ramen Noodle Calculator" emoji="🍜">
      Balance hydration, kansui, egg and cut number, then see which regional ramen style the noodle actually fits.
    </Card>
    <Card to="/food/cookbooks/" title="Cookbook Finder" emoji="📚">
      Search the cookbooks on my shelf for a recipe and get the book and page number.
    </Card>
    <Card to="https://dreamingofnoodles.com" title="Dreaming of Noodles" emoji="🥢" external>
      My Japanese food blog.
    </Card>
  </>
);

export function Food() {
  return (
    <main>
      <section className="intro">
        <h1>Food</h1>
        <p>Calculators and a cookbook finder for the kitchen. They work offline once you've opened them, and you can add this site to your phone's home screen.</p>
      </section>
      <section className="category">
        <div className="cards">{FOOD_CARDS}</div>
      </section>
      <Backup />
    </main>
  );
}
