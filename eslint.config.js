const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json'],
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Enforce single quotes
      'quotes': ['error', 'single'],
      
      // Enforce semicolons
      'semi': ['error', 'always'],
      
      // Enforce final newline
      'eol-last': ['error', 'always'],
      
      // Enforce LF line endings
      'linebreak-style': ['error', 'unix'],
      
      // No trailing spaces
      'no-trailing-spaces': 'error',
      
      // Enforce UTF-8 encoding (handled by editor)
      'unicode-bom': ['error', 'never'],
      
      // TypeScript basic rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'ignoreRestSiblings': true
        }
      ],
      'no-unused-vars': 'off', // Turn off base rule to use TypeScript version
      
      // Prevent Korean characters in identifiers
      'no-irregular-whitespace': 'error',
    },
  },
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
]; 
