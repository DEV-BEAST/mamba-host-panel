module.exports = {
  extends: ['@mambaPanel/config/eslint/base.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
