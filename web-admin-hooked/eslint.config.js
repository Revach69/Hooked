const { FlatCompat } = require('@eslint/eslintrc');
const { dirname } = require('path');

const compat = new FlatCompat({
  baseDirectory: dirname(__filename),
});

module.exports = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // Add or override rules here as needed
    },
  },
];
