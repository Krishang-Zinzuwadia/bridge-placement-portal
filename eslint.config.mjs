import js from '@eslint/js';
import {defineConfig,globalIgnores} from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig(
  globalIgnores(['node_modules/**','dist/**','.wrangler/**','work/**']),
  {
    files:['worker/**/*.mjs','shared/**/*.mjs','scripts/**/*.mjs','tests/**/*.mjs','*.{js,mjs}'],
    extends:[js.configs.recommended],
    languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals.node},
    rules:{
      // Callback arguments and defensive catch bindings may intentionally be unused.
      'no-unused-vars':['error',{vars:'all',args:'none',caughtErrors:'none',ignoreRestSiblings:true}],
      'no-constant-binary-expression':'error',
      'no-unreachable-loop':'error',
      'no-promise-executor-return':'error',
    },
  },
  {
    files:['worker/**/*.mjs'],
    languageOptions:{globals:{...globals.serviceworker,...globals.worker}},
  },
  {
    files:['src/**/*.{ts,tsx}'],
    extends:[js.configs.recommended,tseslint.configs.recommended],
    languageOptions:{globals:globals.browser},
    plugins:{'react-hooks':reactHooks},
    rules:{
      // Existing API/snapshot boundaries use `any`; strict tsc still checks the app.
      '@typescript-eslint/no-explicit-any':'off',
      '@typescript-eslint/no-unused-vars':['error',{vars:'all',args:'none',caughtErrors:'none',ignoreRestSiblings:true}],
      'react-hooks/rules-of-hooks':'error',
      'no-constant-binary-expression':'error',
      'no-unreachable-loop':'error',
      'no-promise-executor-return':'error',
    },
  },
);
