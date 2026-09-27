import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { NotFound } from "@/pages/NotFound";
import { IceCream } from "@/tools/ice-cream/IceCream";
import { Bread } from "@/tools/bread/Bread";
import { Ramen } from "@/tools/ramen/Ramen";
import { Cookbooks } from "@/tools/cookbooks/Cookbooks";
import { Flavours } from "@/tools/flavours/Flavours";
import { FlavourDetail } from "@/tools/flavours/FlavourDetail";
import { Guitar } from "@/tools/guitar/pages/Guitar";
import { Course } from "@/tools/guitar/pages/Course";
import { Day } from "@/tools/guitar/pages/Day";

// Keep the route list in sync with scripts/postbuild.mjs.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/food", element: <Food /> },
      { path: "/food/ice-cream-calculator", element: <IceCream /> },
      { path: "/food/bakers-percentage", element: <Bread /> },
      { path: "/food/ramen-noodles", element: <Ramen /> },
      { path: "/food/cookbooks", element: <Cookbooks /> },
      { path: "/food/flavour-library", element: <Flavours /> },
      { path: "/food/flavour-library/:id", element: <FlavourDetail /> },
      { path: "/guitar", element: <Guitar /> },
      { path: "/guitar/:course", element: <Course /> },
      { path: "/guitar/:course/day/:n", element: <Day /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
