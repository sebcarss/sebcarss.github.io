import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { Food } from "@/pages/Food";
import { NotFound } from "@/pages/NotFound";

// Keep the route list in sync with scripts/postbuild.mjs.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/food", element: <Food /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
