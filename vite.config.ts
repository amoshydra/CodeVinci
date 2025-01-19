import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import monacoEditorEsmPlugin from 'vite-plugin-monaco-editor-esm';

const BASE_URL = process.env.BASE_URL || "";

// https://vite.dev/config/
export default defineConfig({
  base: `${BASE_URL}/`,
  plugins: [
    monacoEditorEsmPlugin({
      publicPath: `${BASE_URL}/monacoeditorwork`.replace(/^\/+/, ""),
    }),
    react(),
    tailwindcss()
  ],
});
