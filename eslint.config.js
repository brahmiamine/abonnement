import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'e2e/screenshots',
      'supabase/functions',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs.flat.recommended,
      prettier,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // Le texte d'un interrupteur est imbriqué sur trois niveaux (label > span > strong).
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
)
