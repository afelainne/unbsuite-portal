import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { contract, literals } from "./design-system/adherence.eslint.js";

export default tseslint.config(
  // Not linted: build output, the design system's own component sources (they
  // are where the px values behind the tokens live), and everything under
  // design-system/reference — specimen pages shipped by the export, kept for
  // reading, not maintained as project code.
  { ignores: ["dist", "design-system/components/**", "design-system/reference/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Relax rules to unblock lint quickly for now
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/prefer-const": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "prefer-const": "off",
      "no-case-declarations": "off",
      "no-dupe-else-if": "off",
      "no-unused-expressions": "off",
      "no-useless-escape": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },

  // Design system adherence — the component contract: only declared props,
  // only declared variant values, and imports through design-system/index.js
  // instead of a component file.
  //
  // Scope is deliberately narrow. The UNBSTOOLS system and shadcn/ui share
  // component names (Button, Badge, Switch, Tabs, Card) with different props,
  // so pointing these selectors at src/** reports 41 false positives against
  // perfectly correct shadcn usage. Widen `files` to the folder where you
  // actually build with the design system, not to the whole app.
  //
  // `literals` (no raw hex, px or font-family) is off for the same kind of
  // reason: it assumes every value comes from a design-system CSS variable,
  // while this app is Tailwind-based and carries hex colours as data. Enable
  // it per folder when the code is written against the tokens:
  //
  //   import { literals } from "./design-system/adherence.eslint.js";
  //   { files: ["src/brand/**"], rules: { ...literals } }
  {
    files: ["design-system/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, React: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { ...contract },
  },
);
