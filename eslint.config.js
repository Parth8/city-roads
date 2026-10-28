import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  {ignores: ['dist/**', 'node_modules/**']},
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.browser}
    },
    rules: {
      'no-unused-vars': 'warn',
      // Short names like "Dial" or "Toggle" read better here and clash with no HTML element.
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['scripts/**', '*.config.js'],
    languageOptions: {globals: {...globals.node}}
  }
];
