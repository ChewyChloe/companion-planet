import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "release/**",
      "artifacts/**",
      "test-results/**",
      "test-results-electron/**",
      "test-results-mobile/**",
      "test-results-design/**",
      "playwright-report/**",
      "playwright-report-electron/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
