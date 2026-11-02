import gtsConfig from './node_modules/gts/build/src/index.js';
import ignores from './eslint.ignores.js';
import {defineConfig} from 'eslint/config';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import sonarjs from 'eslint-plugin-sonarjs';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  {
    ignores: [
      ...ignores,
      'eslint.config.js', // Ignore config files
      'eslint.ignores.js',
    ],
  },
  ...gtsConfig,
  {
    plugins: {
      "@tanstack/query": tanstackQuery,
      sonarjs,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        // Only use tsconfig.app.json - it's the actual app config
        // Using both tsconfig files causes duplicate parsing and slows down linting
        project: ['./tsconfig.app.json'],
      },
    },
    rules: {
      // Override GTS's quote rule to match Prettier (double quotes)
      // GTS defaults to single quotes, but Prettier is configured for double quotes
      // This ensures ESLint doesn't conflict with Prettier's formatting
      quotes: ['warn', 'double', { avoidEscape: true }],
      // Disable React import requirement (using new JSX transform with jsx: "react-jsx")
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Complexity rules - set to warn for existing code
      complexity: ['warn', { max: 10 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', { max: 15 }], // Increased to accommodate standard async patterns with error handling
      'max-params': ['warn', { max: 3 }],
      'sonarjs/cognitive-complexity': ['warn', 15],
      // TanStack Query: enforce exhaustive deps in query keys
      '@tanstack/query/exhaustive-deps': 'warn',
      // React hooks (classic rules only; React Compiler rules are opt-in)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Prevent feature components from importing hooks or services
  {
    files: ['src/features/**/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/services'],
              message:
                'Components cannot import from services. Use hooks instead.',
            },
          ],
        },
      ],
    },
  },
  // Prevent hooks from importing components
  {
    files: ['src/features/**/hooks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/components'],
              message: 'Hooks cannot import from components.',
            },
          ],
        },
      ],
    },
  },
  // Prevent common components from importing features
  {
    files: ['src/components/common/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message: 'Common components cannot import from features.',
            },
          ],
        },
      ],
    },
  },
  // Detect hardcoded colors. Colors are design tokens in src/index.css, used via
  // Tailwind utilities (bg-primary, text-muted-foreground, ...).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        // Tailwind arbitrary color values in class strings, e.g. "bg-[#ff0000]", "text-[rgb(0,0,0)]"
        {
          selector: 'Literal[value=/\\[(#[0-9A-Fa-f]{3,8}|rgba?\\(|hsla?\\(|oklch\\()/]',
          message: 'Avoid hardcoded colors. Use a design token utility (see src/index.css).',
        },
        {
          selector:
            'TemplateElement[value.raw=/\\[(#[0-9A-Fa-f]{3,8}|rgba?\\(|hsla?\\(|oklch\\()/]',
          message: 'Avoid hardcoded colors. Use a design token utility (see src/index.css).',
        },
        // Raw colors in inline style props
        {
          selector:
            "JSXAttribute[name.name='style'] Literal[value=/^(#[0-9A-Fa-f]{3,8}|rgba?\\(|hsla?\\(|oklch\\()/]",
          message: 'Avoid hardcoded colors. Use a design token utility (see src/index.css).',
        },
      ],
    },
  },
]);

