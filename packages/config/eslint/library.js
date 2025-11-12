const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.turbo/',
    '.eslintrc.js',
    '**/*.config.js',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
