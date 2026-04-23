import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // Enforce explicit return types on functions — important for a financial calc engine
      "@typescript-eslint/explicit-function-return-type": "off", // Too noisy for React components; enable for lib/ only
      // No unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // No any — financial logic must be typed
      "@typescript-eslint/no-explicit-any": "error",
      // Consistent imports
      "import/order": "off", // Let Prettier handle formatting
    },
  },
  {
    // Stricter rules for the calculation engine
    files: ["src/lib/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
