export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    'color-named': 'never',
    'declaration-no-important': true,
    // BEM: block__element--modifier
    'selector-class-pattern':
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z][a-z0-9]*(-[a-z0-9]+)*)?(--[a-z][a-z0-9]*(-[a-z0-9]+)*)?$',
    // Allow legacy range notation for now; upgrade in Phase 5 audit
    'media-feature-range-notation': 'prefix',
    'property-no-vendor-prefix': [true, { disableFix: false }],
  },
  overrides: [
    {
      files: ['css/reset.css'],
      rules: {
        'property-no-vendor-prefix': null,
      },
    },
  ],
};
