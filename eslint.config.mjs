import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es6,
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": "warn",
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: ["warn", "always"],
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
  {
    ignores: ["**/out", "**/dist", "**/*.d.ts", "src/**/*.js"],
  },
);
