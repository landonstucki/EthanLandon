// stylelint.config.mjs
import stylelintConfigStandard from "stylelint-config-standard";
import stylisticPlugin from "@stylistic/stylelint-plugin";

export default {
  plugins: [stylisticPlugin],
  extends: [stylelintConfigStandard],
  rules: {
    // ✅ Core stylistic rules
    "@stylistic/indentation": 2,
    "@stylistic/color-hex-case": "lower",

    // ✅ Recommended good practices
    "block-no-empty": true,
    "declaration-block-trailing-semicolon": "always",
    "no-missing-end-of-source-newline": true,

    // 🚫 Disabled rules you don’t want enforced
    "no-descending-specificity": null
  },

  // ✅ Recommended for smooth auto-fixes and modern syntax support
  ignoreFiles: ["**/node_modules/**"],
  overrides: [
    {
      files: ["**/*.css", "**/*.scss", "**/*.less"],
      customSyntax: "postcss-scss"
    }
  ],

  // ✅ Ensures Stylelint can fix automatically when you save (via VS Code)
  fix: true
};
