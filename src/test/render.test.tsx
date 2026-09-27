// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { IceCream } from "@/tools/ice-cream/IceCream";
import { Bread } from "@/tools/bread/Bread";
import { Ramen } from "@/tools/ramen/Ramen";
import { Cookbooks } from "@/tools/cookbooks/Cookbooks";
import { Guitar } from "@/tools/guitar/pages/Guitar";
import { Course } from "@/tools/guitar/pages/Course";
import { Day } from "@/tools/guitar/pages/Day";
import { PROGRESS_KEY } from "@/tools/guitar/useProgress";

// Fixed books so the smoke test doesn't depend on the real data files.
vi.mock("@/tools/cookbooks/data", async (importActual) => {
  const actual = await importActual<typeof import("@/tools/cookbooks/data")>();
  const BOOKS = [
    {
      book: "Test Kitchen",
      recipes: [
        { title: "Pasta Bake", page: 34 },
        { title: "Chicken Pasta", page: 36 },
        { title: "Moussaka", page: 12 },
      ],
      index: [
        { term: "Aubergine", pages: [12] },
        { term: "Cheese", sub: "ricotta", pages: [34] },
      ],
    },
    {
      book: "Weeknight Suppers",
      recipes: [
        { title: "Easy Pasta Bake", page: 80 },
        { title: "Tomato Soup", page: 5 },
        { title: "Mac & Cheese", page: 20 },
      ],
    },
    // Imported from photos of its index, with no recipe titles.
    {
      book: "Index Only",
      recipes: [],
      index: [
        { term: "Pork", sub: "roast belly", pages: [244] },
        { term: "Salo", pages: [80] },
      ],
    },
  ];
  return { ...actual, BOOKS, ENTRIES: actual.toEntries(BOOKS), INDEX_ROWS: actual.toIndexRows(BOOKS) };
});

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

  it("cookbooks: recipe search across books, exact match first", () => {
    at("/food/cookbooks", <Cookbooks />);
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "pasta bake" } });
    const items = screen.getAllByRole("listitem");
    expect(items[0]!.textContent).toMatch(/Pasta Bake.*Exact.*Test Kitchen · p\. 34/);
    expect(screen.getByText("Easy Pasta Bake")).toBeTruthy();
    expect(screen.getByText("Close matches")).toBeTruthy();
    expect(screen.getByText("Chicken Pasta")).toBeTruthy();
    expect(screen.queryByText("Books")).toBeNull(); // no book is called "pasta bake"
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "sushi" } });
    expect(screen.getByText(/No recipes match/)).toBeTruthy();
  });

  it("cookbooks: browse the book list, open a book, search in it and go back", () => {
    at("/food/cookbooks", <Cookbooks />);
    expect(screen.getByText("Your books (3)")).toBeTruthy();
    expect(screen.getByText("Test Kitchen").closest("a")!.textContent).toMatch(/Test Kitchen3 recipes · index/);
    fireEvent.click(screen.getByText("Test Kitchen"));
    expect(screen.getByRole("heading", { name: "Test Kitchen" })).toBeTruthy();
    // The whole book, in page order.
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Moussakap. 12", "Pasta Bakep. 34", "Chicken Pastap. 36"]);
    // Searching inside the book only finds its recipes.
    fireEvent.change(screen.getByLabelText("Search this book"), { target: { value: "pasta bake" } });
    expect(screen.getByText("Pasta Bake")).toBeTruthy();
    expect(screen.queryByText("Easy Pasta Bake")).toBeNull();
    fireEvent.click(screen.getByText("‹ All books"));
    expect(screen.getByText("Your books (3)")).toBeTruthy();
  });

  it("cookbooks: find a book by name, or open it from a recipe result", () => {
    at("/food/cookbooks", <Cookbooks />);
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "weeknite suppers" } });
    expect(screen.getByRole("heading", { name: "Books" })).toBeTruthy();
    fireEvent.click(screen.getByText("Weeknight Suppers"));
    expect(screen.getByRole("heading", { name: "Weeknight Suppers" })).toBeTruthy();
    expect((screen.getByLabelText("Search this book") as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByText("‹ All books"));
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "moussaka" } });
    fireEvent.click(screen.getByText("Test Kitchen"));
    expect(screen.getByRole("heading", { name: "Test Kitchen" })).toBeTruthy();
  });

  it("cookbooks: finds a recipe through the book's index, and shows the index", () => {
    at("/food/cookbooks", <Cookbooks />);
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "aubergine" } });
    expect(screen.getByText(/No recipe is called that — see the ingredient matches below/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "By ingredient (1)" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")[0]!.textContent).toMatch(/MoussakaIndex: AubergineTest Kitchen · p\. 12/);
    // A recipe named like the query comes first, apart from the ingredient matches.
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "cheese" } });
    expect(screen.queryByText(/No recipe is called that/)).toBeNull();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Mac & CheeseWeeknight Suppers · p. 20", "Pasta BakeIndex: Cheese › ricottaTest Kitchen · p. 34"]);
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Test Kitchen"));
    fireEvent.click(screen.getByText("Index"));
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Aubergine12", "Cheesericotta34"]);
    fireEvent.click(screen.getByText("Recipes"));
    expect(screen.getByText("Moussaka")).toBeTruthy();
    fireEvent.click(screen.getByText("‹ All books"));
    fireEvent.click(screen.getByText("Weeknight Suppers"));
    expect(screen.queryByText("Index")).toBeNull(); // no index, no toggle
  });

  it("cookbooks: a book with only an index opens from a result link, on its index", () => {
    at("/food/cookbooks", <Cookbooks />);
    expect(screen.getByText("Index Only").closest("a")!.textContent).toMatch(/Index Only2 index lines/);
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "pork belly" } });
    expect(screen.getByText("roast belly")).toBeTruthy();
    expect(screen.getByText("Index: Pork › roast belly")).toBeTruthy();
    fireEvent.click(screen.getByText("Index Only"));
    expect(screen.getByRole("heading", { name: "Index Only" })).toBeTruthy();
    expect(screen.queryByText("Book not found")).toBeNull();
    expect(screen.queryByRole("group", { name: "Show" })).toBeNull(); // nothing to toggle to
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Porkroast belly244", "Salo80"]);
  });

  it("cookbooks: an unknown book says so", () => {
    render(
      <MemoryRouter initialEntries={["/food/cookbooks?book=Nope"]}>
        <Cookbooks />
      </MemoryRouter>,
    );
    expect(screen.getByText("Book not found")).toBeTruthy();
  });

  it("guitar: the hub lists the finger picking course and the course shows its plan and tests", () => {
    at("/guitar", <Guitar />);
    expect(screen.getByText("Finger Picking").closest("a")!.getAttribute("href")).toBe("/guitar/fingerpicking/");
    cleanup();
    render(
      <MemoryRouter initialEntries={["/guitar/fingerpicking"]}>
        <Routes>
          <Route path="/guitar/:course" element={<Course />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Start day 1 ›")).toBeTruthy();
    expect(screen.getAllByText(/^Day \d$/)).toHaveLength(7);
    expect(screen.getByText("Travis at 90")).toBeTruthy();
    expect(screen.getByText(/0 of 7 exit tests passed/)).toBeTruthy();
  });

  it("guitar: a day renders its blocks and tab, self-assessment records progress, and failures carry over", () => {
    const day = (n: number) =>
      render(
        <MemoryRouter initialEntries={[`/guitar/fingerpicking/day/${n}`]}>
          <Routes>
            <Route path="/guitar/:course/day/:n" element={<Day />} />
          </Routes>
        </MemoryRouter>,
      );
    day(1);
    expect(screen.getByRole("heading", { name: /Day 1: Hand setup/ })).toBeTruthy();
    expect(screen.getAllByText("Why it works").length).toBeGreaterThan(2);
    expect(screen.getAllByRole("img", { name: /^Bar 1, C$/ }).length).toBeGreaterThan(0);
    // Baseline tests are on day 1.
    expect(screen.getByRole("heading", { name: "Baseline: Travis at 90" })).toBeTruthy();

    // Self-assess the alternating-bass challenge: needs its checklist ticked first.
    const card = screen.getByText(/Alternating bass through C–Am–Fmaj7–G for 8 bars at 80/).closest(".challenge") as HTMLElement;
    const passBtn = within(card).getByRole("button", { name: "Passed" });
    expect((passBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(card).getByLabelText(/Right root string on every chord/));
    fireEvent.click(passBtn);
    expect(within(card).getByText(/Passed at 80 bpm/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Finish day 1" }));
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)!);
    expect(saved.challenges["fingerpicking:c-thumb-alt"].passed).toBe(true);
    expect(saved.days["fingerpicking:1"].completedAt).toBeTruthy();
    cleanup();

    // The untried day-1 challenge moves to day 2's warm-up.
    day(2);
    expect(screen.getByText("Revisit from day 1")).toBeTruthy();
    expect(screen.getByText(/p-i-m-a over C–Am–G–Em for 8 bars at 70/)).toBeTruthy();
    expect(screen.queryByText(/Alternating bass through C–Am–Fmaj7–G for 8 bars at 80/)).toBeNull();
  });

  it("guitar: day 7 has the capstone and all seven exit tests", () => {
    render(
      <MemoryRouter initialEntries={["/guitar/fingerpicking/day/7"]}>
        <Routes>
          <Route path="/guitar/:course/day/:n" element={<Day />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading", { name: /^Exit test: / })).toHaveLength(7);
    expect(screen.getByRole("heading", { name: "Lanterns, start to finish" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /^Bar 37/ }).length).toBe(1);
  });

  it("guitar: an unknown course or day is not found", () => {
    render(
      <MemoryRouter initialEntries={["/guitar/fingerpicking/day/9"]}>
        <Routes>
          <Route path="/guitar/:course/day/:n" element={<Day />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("heading", { name: /^Day 9/ })).toBeNull();
  });
});
