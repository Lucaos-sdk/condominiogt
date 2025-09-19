module.exports = {
  env: {
    browser: false,
    node: true,
    es6: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Erros
    'no-console': 'off', // Permitir console.log em desenvolvimento
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',

    // Estilo de código
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],

    // Boas práticas
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': 'error',
    'curly': 'error',
    'no-trailing-spaces': 'error',
    'comma-dangle': ['error', 'always-multiline'],

    // Node.js específicas
    'no-process-exit': 'error',
    'handle-callback-err': 'error',
  },
  globals: {
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    module: 'readonly',
    require: 'readonly',
    exports: 'readonly',
    global: 'readonly',
    console: 'readonly',
  },
};