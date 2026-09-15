// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { IceCream } from "@/tools/ice-cream/IceCream";
import { Bread } from "@/tools/bread/Bread";

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
});
