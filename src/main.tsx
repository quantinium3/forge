import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import "./index.css";

import { routeTree } from "./routeTree.gen";
import { TooltipProvider } from "./components/ui/tooltip";

const history = createHashHistory();
const router = createRouter({ routeTree, history });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </StrictMode>,
  );
}
