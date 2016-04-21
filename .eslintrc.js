module.exports = {
  extends: 'eslint',
  parserOptions: { ecmaVersion: 5 },
  env: {
    browser: false,
    node: true
  },
  rules: {
    'brace-style': [1, '1tbs', { allowSingleLine: true }],
    'indent': [1, 2],
    'quotes': [1, 'single'],
    'no-underscore-dangle': 0,
    'no-unused-vars': [2, { vars: 'all', args: 'all', argsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^ignore' }],
    'one-var': [2, 'never'],
    'require-jsdoc': 0,
    'space-before-function-paren': [1, {anonymous: 'always', named: 'never'}],
    'strict': 0
  }
};
