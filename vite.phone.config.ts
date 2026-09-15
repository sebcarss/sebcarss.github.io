// `npm run dev:phone` — serves over HTTPS on the LAN so the service worker
// and Web Share API work when testing on a phone.
import { mergeConfig } from "vitest/config";
import basicSsl from "@vitejs/plugin-basic-ssl";
import base from "./vite.config";

export default mergeConfig(base, { plugins: [basicSsl()] });
