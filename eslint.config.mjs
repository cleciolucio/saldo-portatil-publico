import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['node_modules/**', 'dist/**', 'android/**', 'ios/**', 'reports/**', 'index.html'] },
  js.configs.recommended,
  {
    files: ['tests/k6/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __ITER: 'readonly' } },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
