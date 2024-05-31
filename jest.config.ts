
import type { 
  JestConfigWithTsJest, 
  TsJestTransformerOptions 
} from 'ts-jest'

export default async (): Promise<JestConfigWithTsJest> => {

  const transformerOptions: TsJestTransformerOptions = {
     diagnostics: false,
     babelConfig: {
       presets: [
         ['@babel/react', { modules: false }],
         ['@babel/preset-env', {
           modules: false,
           useBuiltIns: "usage",
           corejs: '3',
           targets: {
             node: 'current',
           },
         }],
         ['@babel/preset-typescript',
           {
             isTSX: true,
             allowNamespaces: true,
             allExtensions: true,
           }
         ],
         [
           '@babel/preset-flow',
         ]
       ],
       plugins: [

         /**
          * used to resolve modules
          */
         ['module-resolver', {
           root: './src',
           alias: {
             '@reactory/server-core': './src',
             '@reactory/server-modules': './src/modules'
           }
         }],

         ['@babel/plugin-transform-typescript', {
           isTSX: true,
           allowNamespaces: true,
           allExtensions: true,
         }],
         ['@babel/plugin-proposal-decorators', { legacy: true }],
         ['@babel/plugin-proposal-class-properties', { loose: true }],

         // stage 0
         '@babel/plugin-proposal-function-bind',
         '@babel/plugin-proposal-export-default-from',
         '@babel/plugin-proposal-json-strings',

         // Stage 2
         '@babel/plugin-proposal-function-sent',
         '@babel/plugin-proposal-export-namespace-from',
         '@babel/plugin-proposal-numeric-separator',
         '@babel/plugin-proposal-throw-expressions',

         // Stage 3
         '@babel/plugin-transform-classes',
         '@babel/plugin-syntax-dynamic-import',
         '@babel/plugin-syntax-import-meta',
         '@babel/plugin-transform-object-set-prototype-of-to-assign',
         '@babel/plugin-transform-arrow-functions',
         '@babel/plugin-transform-flow-strip-types'

       ],
       ignore: ['node_modules/**/*'],
       include: ['src/**/*', 'node_modules/reactory/@reactory/reactory-core/**/*']
     },     
  };

  const config: JestConfigWithTsJest = {
    verbose: true,
    preset: 'ts-jest',
    roots: ['src', 'test'],
    displayName: 'reactory-server',
    modulePaths: ['<rootDir>/src'],
    testEnvironment: 'node',
    transform: {
      '^.+\\.[jt]sx?$': [
        'ts-jest', transformerOptions,
      ],
    },   
    moduleNameMapper: {
      '^@reactory/server-core/(.*)$': '<rootDir>/src/$1',
      '^@reactory/server-modules/(.*)$': '<rootDir>/src/modules/$1',
      '^test/(.*)$': '<rootDir>/test/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/test/setup/init.ts'],
  };

  return config;
};
