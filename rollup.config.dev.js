import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/server.js',
  output: {
    file: 'dist/reactory-api.js',
    format: 'umd',
  },
  plugins: [
    resolve(),
    babel({
      exclude: './node_modules/**', // only transpile our source code
    }),
  ],
};
