/* eslint-env node */
module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 1
  },
  env: {
    browser: true,
    es2022: true,
    'vue/setup-compiler-macros': true
  },
  globals: {
    gtag: 'readonly'
  },
  overrides: [{
    files: ['scripts/**', 'src/proto/*.js', '*.config.js'],
    env: {node: true}
  }, {
    // Vendored third party code
    files: ['src/components/vue3-color/**', 'src/lib/canvas2BlobPolyfill.js'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-redeclare': 'off',
      'no-extra-semi': 'off'
    }
  }]
}
