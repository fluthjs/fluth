module.exports = {
  './src/**/*.ts': [
    () => 'pnpm run check',
    'eslint --cache --fix',
    'prettier --write',
  ],
}
