import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2022',
  clean: true,
  treeshake: true,
  noExternal: ['limu'],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
  esbuildPlugins: [
    {
      name: 'limu-esm-interop',
      setup(build) {
        if (build.initialOptions.format !== 'esm') {
          build.onResolve({ filter: /^limu$/ }, () => ({
            path: 'limu',
            external: true,
          }))
          return
        }
        build.onResolve({ filter: /^limu$/ }, (args) => {
          if (args.namespace === 'limu-interop') {
            return { path: 'limu', external: true }
          }
          return { path: 'limu-esm-interop', namespace: 'limu-interop' }
        })
        build.onLoad({ filter: /^limu-esm-interop$/, namespace: 'limu-interop' }, () => ({
          contents: [
            "import * as __limuNS from 'limu'",
            "const __limu = 'produce' in __limuNS ? __limuNS : __limuNS.default",
            'export const { produce, createDraft, finishDraft } = __limu',
          ].join('\n'),
          loader: 'js',
        }))
      },
    },
  ],
})
