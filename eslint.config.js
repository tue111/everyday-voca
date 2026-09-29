import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  { ignores: ['.npm-cache/**', 'dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', '.data/**', '.test-data/**', 'public/**'] },
  js.configs.recommended, ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);

