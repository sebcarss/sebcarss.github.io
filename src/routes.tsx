import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { NotFound } from "@/pages/NotFound";
import { IceCream } from "@/tools/ice-cream/IceCream";
import { Bread } from "@/tools/bread/Bread";

// Keep the route list in sync with scripts/postbuild.mjs.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/food", element: <Food /> },
      { path: "/food/ice-cream-calculator", element: <IceCream /> },
      { path: "/food/bakers-percentage", element: <Bread /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
