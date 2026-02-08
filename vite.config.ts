import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import monacoEditorEsmPlugin from 'vite-plugin-monaco-editor-esm';

const BASE_URL = process.env.BASE_URL || "";

// https://vite.dev/config/
export default defineConfig({
  base: BASE_URL,
  plugins: [
    monacoEditorEsmPlugin({
      // @TODO: BUG - base path is repeated
      customDistPath(root, buildoutdir, _base /* discard */) {
        return path.join(root, buildoutdir, "monacoeditorwork");
      },
      publicPath: "monacoeditorwork",
    }),
    react(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        loader: path.resolve(__dirname, "loader.html"),
      },
    },
  },
});
