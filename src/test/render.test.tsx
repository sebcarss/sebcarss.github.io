// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { IceCream } from "@/tools/ice-cream/IceCream";
import { Bread } from "@/tools/bread/Bread";
import { Ramen } from "@/tools/ramen/Ramen";
import { Cookbooks } from "@/tools/cookbooks/Cookbooks";

// Fixed books so the smoke test doesn't depend on the real data files.
vi.mock("@/tools/cookbooks/data", () => ({
  ENTRIES: [
    { title: "Pasta Bake", book: "Test Kitchen", page: 34 },
    { title: "Chicken Pasta", book: "Test Kitchen", page: 36 },
  ],
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: async () => {} }),
}));

const at = (path: string, el: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={el} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe("pages render", () => {
  it("home and food list the calculators", () => {
    at("/", <Home />);
    expect(screen.getAllByText(/Ice Cream Calculator/).length).toBeGreaterThan(0);
    cleanup();
    at("/food", <Food />);
    expect(screen.getByText(/Ramen Noodle Calculator/)).toBeTruthy();
    expect(screen.getByText(/Cookbook Finder/)).toBeTruthy();
    expect(screen.getByText(/Export all/)).toBeTruthy();
  });

  it("ice cream computes the default recipe and reacts to edits", () => {
    at("/food/ice-cream-calculator", <IceCream />);
    expect(screen.getByText("1,000 g")).toBeTruthy();
    const grams = screen.getAllByLabelText("Grams")[0]! as HTMLInputElement;
    fireEvent.change(grams, { target: { value: "0" } });
    expect(screen.getByText("500 g")).toBeTruthy();
    fireEvent.click(screen.getByText("Sorbet"));
    expect(screen.getByText(/target 24–32%/)).toBeTruthy();
    // Save without a name asks for one; with a name it stores the recipe.
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText(/Give the recipe a name/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Recipe name"), { target: { value: "Test base" } });
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Test base")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sc:recipes:v1")!)).toHaveLength(1);
  });

  it("bread shows the split tables when a preferment is chosen", () => {
    at("/food/bakers-percentage", <Bread />);
    expect(screen.getByText("865 g")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "poolish" } });
    expect(screen.getByText("Final dough")).toBeTruthy();
    expect(screen.getByText(/All of the poolish/)).toBeTruthy();
    fireEvent.click(screen.getByText("Target dough"));
    expect(screen.getByLabelText("Loaves")).toBeTruthy();
    expect(screen.getByText(/needs .* g flour/)).toBeTruthy();
  });

  it("ramen: picking yolk seeds a percentage and changes the analysis", () => {
    at("/food/ramen-noodles", <Ramen />);
    const before = screen.getByText(/g total water/).textContent;
    fireEvent.change(screen.getByLabelText("Egg form"), { target: { value: "egg-yolk" } });
    const eggPct = screen.getByLabelText("Egg percent") as HTMLInputElement;
    expect(Number(eggPct.value)).toBeGreaterThan(0);
    expect(screen.getByText(/g total water/).textContent).not.toBe(before);
    expect(screen.getByText(/10% whole-egg eq/)).toBeTruthy();
    fireEvent.click(screen.getByText("What did I make?"));
    expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Match a style"));
    fireEvent.click(screen.getByText("Load reference formula"));
    expect(screen.getByText(/100% match|9\d% match/)).toBeTruthy();
  });

  it("cookbooks: searching shows the book and page, exact match first", () => {
    at("/food/cookbooks", <Cookbooks />);
    expect(screen.queryByText("Results")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "pasta bake" } });
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toMatch(/Pasta Bake.*Exact.*Test Kitchen · p\. 34/);
    expect(screen.getByText("Also mentions…")).toBeTruthy();
    expect(screen.getByText("Chicken Pasta")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "sushi" } });
    expect(screen.getByText(/No recipes match/)).toBeTruthy();
  });
});
