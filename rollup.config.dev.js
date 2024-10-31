import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from './.rollup/copy';

const jsx = require('rollup-plugin-jsx');

const options = {
  input: './src/Reactory.ts',
  output: [
    {
      file: 'dist/reactory.core.js',
      format: 'umd',
      name: 'ReactoryCore',
      sourcemap: true,
    },
    {
      file: 'dist/reactory.core.esm.js',
      format: 'esm',
      name: 'ReactoryCore',
      sourcemap: true,
    },
  ],

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
      preventAssignment: true,
    }),
    commonjs({
      include: 'node_modules/**',
      exclude: [ 'node_modules/process-es6/**' ],
    }),
    typescript({
      tsconfig: 'tsconfig.json',
      sourceMap: true,
    }),
    babel({
      exclude: 'node_modules/**',
      include: [ './src/**/*.ts', './src/**/*.js', './src/**/*.tsx' ],
      babelHelpers: 'inline',
      extensions: [ '.ts', '.tsx', '.js', '.jsx' ],
      babelrc: false,
      presets: [
        [
          '@babel/env',
          {
            modules: false,
          },
        ],

        [ '@babel/react' ],

        [ '@babel/typescript' ],
      ],
      plugins: [ '@babel/plugin-proposal-class-properties' ],
    }),
    resolve(),
    jsx({ factory: 'React.createElement' }),
    copy({
      './src/types/global.d.ts': './dist/types/global.d.ts',
      './src/types/index.d.ts': './dist/types/index.d.ts',
    }),
  ],
};

export default options;
