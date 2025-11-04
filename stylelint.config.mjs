// stylelint.config.mjs
import stylelintConfigStandard from "stylelint-config-standard";
import stylisticPlugin from "@stylistic/stylelint-plugin";

export default {
  plugins: [stylisticPlugin],
  extends: [stylelintConfigStandard],
  rules: {
    "@stylistic/indentation": 2,
    "@stylistic/color-hex-case": "lower",
    "block-no-empty": true,

    // 🚫 disable specific rule
    "no-descending-specificity": null
  }
};
