import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// TRD 10-4: typescript-eslint recommended, react-hooks, jsx-a11y, import/order, any 금지
export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'src/api/schema.d.ts',
      'src/styles/tokens.css',
      'public/mockServiceWorker.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, import: importX },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.flatConfigs.recommended.rules,
      // role 이라는 이름의 props 를 쓰는 컴포넌트(RequireRole)는 검사하지 않는다
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-default-export': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // TRD 10-2: 민감정보를 콘솔에 찍지 않는다
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // TRD 10-4: 상위 폴더 상대 경로 2단계 이상 금지
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../../*'], message: '상위 2단계 이상은 @/ 별칭을 쓴다 (TRD 10-4).' },
          ],
        },
      ],
      // TRD 18-5: 사용자 입력은 평문으로만 렌더링한다
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML 금지 (TRD 18-5).',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**', 'public/**', 'tests/e2e/**'],
    languageOptions: { globals: { ...globals.node, ...globals.serviceworker } },
    rules: { 'import/no-default-export': 'off', 'no-console': 'off' },
  },
);
