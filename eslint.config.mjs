import config from '@continuum/config/eslint';

export default [
  {
    // Global ignore must be an isolated object at the top
    ignores: ['next-env.d.ts', '**/next-env.d.ts', '.next/**/*'],
  },
  ...config,
];
