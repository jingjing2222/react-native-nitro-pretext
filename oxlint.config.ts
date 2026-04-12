import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["import", "react"],
  categories: {
    correctness: "warn",
  },
  rules: {
    "eslint/no-unused-vars": "error",
  },
});
