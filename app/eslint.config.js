// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      // BNA UI components installed verbatim by `npx bna-ui add` — upstream
      // source, kept as-is so `bna-ui add --overwrite` can refresh it.
      "src/components/ui/*",
      "src/hooks/useColorScheme.web.ts",
    ],
  }
]);
