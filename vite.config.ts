import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BASE_URL = process.env.BASE_URL || "";

// https://vite.dev/config/
export default defineConfig({
  base: `${BASE_URL}/`,
  plugins: [react(), tailwindcss()],
});
