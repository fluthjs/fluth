module.exports = {
  './src/**/*.{ts}': [
    () => 'pnpm run check',
    'prettier --write',
    'eslint --cache --fix',
  ],
}
