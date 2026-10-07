import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '.nx'] },
  ...tseslint.configs.strict,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@nx': nx },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            { sourceTag: 'scope:model', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'scope:audio', onlyDependOnLibsWithTags: ['scope:model'] },
            { sourceTag: 'scope:scene', onlyDependOnLibsWithTags: ['scope:model'] },
            { sourceTag: 'scope:ui', onlyDependOnLibsWithTags: ['scope:model'] },
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: ['scope:model', 'scope:audio', 'scope:scene', 'scope:ui'],
            },
          ],
        },
      ],
    },
  },
  {
    // model stays free of rendering, audio and UI frameworks.
    files: ['libs/model/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react*', 'pixi*', 'tone*'] }],
    },
  },
);
