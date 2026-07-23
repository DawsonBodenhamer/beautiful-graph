import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: [
      ".generated/**",
      ".tooling/**",
      "main.js",
      "target/**",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "obsidianmd/prefer-create-el": "off",
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
      "obsidianmd/ui/sentence-case": ["warn", {
        allowAutoFix: true,
        brands: ["Beautiful Graph", "Obsidian"],
        mode: "strict",
      }],
    },
  },
];
