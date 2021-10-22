import typescript from '@rollup/plugin-typescript';
import node from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { string } from 'rollup-plugin-string';
import markdown from '@jackfranklin/rollup-plugin-markdown';
import externalGlobals from "rollup-plugin-external-globals";

// You can have more root bundles by extending this array
const rootFiles = ['index.ts']

export default rootFiles.map(name => {
    /** @type { import("rollup").RollupOptions } */
    const options = {
        input: `src/${name}`,
        watch: {
            include: 'src/**/*.ts',
        },
        external: ['typescript'],
        output: {
            paths: {
                "typescript": "typescript-sandbox/index",
            },
            name,
            dir: 'dist',
            format: 'amd',
            sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
        },
        plugins: [
            string({ include: '**/*.ts.tpl'}),
            markdown(),
            typescript({ tsconfig: 'tsconfig.json' }, { exclude: ['**/*.ts.tpl']}),
            externalGlobals({ typescript: "window.ts" }),
            commonjs(),
            node(),
            json(),
        ],
    }

    return options;
});
