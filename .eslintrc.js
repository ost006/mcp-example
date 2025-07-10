module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'prettier', // Add Prettier compatibility
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // Enforce single quotes
    'quotes': ['error', 'single'],
    '@typescript-eslint/quotes': ['error', 'single'],
    
    // Enforce semicolons
    'semi': ['error', 'always'],
    '@typescript-eslint/semi': ['error', 'always'],
    
    // Enforce final newline
    'eol-last': ['error', 'always'],
    
    // Enforce LF line endings
    'linebreak-style': ['error', 'unix'],
    
    // No trailing spaces
    'no-trailing-spaces': 'error',
    
    // Enforce UTF-8 encoding (handled by editor)
    'unicode-bom': ['error', 'never'],
    
    // TypeScript strict mode enforcement
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // Prevent Korean characters in identifiers
    'no-irregular-whitespace': 'error',
    
    // Additional code quality rules
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    '*.js',
  ],
}; 
