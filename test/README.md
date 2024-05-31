# Testing Reactory Server and Reactory Modules
Each module should manage tests in the module code base. This means all tests for core is contained within src/modules/core/**. The recommended approach is to have your test in the same component folder. i.e. if you have a component in src/modules/foo/bar called baz.ts, you shoud have a test specification in the same folder called baz.spec.ts

## Executing tests
Use the `bin/jest.sh <config name> <environment name> <pattern>` command to execute tests. So if you want to run specific unit tests in your foo module you will execute the following command `bin/jest.sh <config name> <environment name> foo/`

