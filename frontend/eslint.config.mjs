import { createRequire } from "node:module";

import prettier from "eslint-config-prettier";

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Regel-Schärfungen aus eslint-config-next 16 / react-hooks-Plugin (STACK-001 / ADR-047 §E):
      // Unter eslint-config-next 15.0.4 nicht aktiv. Bestandscode bleibt unverändert; ein gezielter
      // Code-Quality-Sweep folgt als eigener Schritt nach M8.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react/display-name": "off",
    },
  },
];

export default config;
