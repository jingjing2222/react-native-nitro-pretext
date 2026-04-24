import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  ignorePatterns: ["CHANGELOG.md", "dist/**", "node_modules/**"],
});
