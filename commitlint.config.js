/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'test', 'refactor', 'perf', 'chore', 'ci', 'docs', 'style'],
    ],
  },
}
