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

    // These two moved into @stylistic when stylelint 16 dropped its own
    // stylistic rules; under the old names they error as "Unknown rule".
    "@stylistic/declaration-block-trailing-semicolon": "always",
    "@stylistic/no-missing-end-of-source-newline": true,

    // 🚫 Disabled rules you don’t want enforced
    "no-descending-specificity": null,

    // Safari still needs both of these prefixes. The config sets fix: true,
    // so without this exception a lint run would strip them and silently
    // break the frosted-glass header and iOS text sizing.
    "property-no-vendor-prefix": [true, {
      ignoreProperties: ["backdrop-filter", "text-size-adjust"]
    }]
  },

  // ✅ Recommended for smooth auto-fixes and modern syntax support
  ignoreFiles: ["**/node_modules/**"],

  // NOTE: this used to apply customSyntax "postcss-scss" to **/*.css, which
  // made stylelint fail to start because that package isn't installed (and
  // isn't needed - this project is plain CSS).
  overrides: [],

  // ✅ Ensures Stylelint can fix automatically when you save (via VS Code)
  fix: true
};
