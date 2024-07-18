## Resolvers
Resolvers can be added as plain JSON objects with key and function pairs or you can follow the convention of adding a resolver class file, that uses decorators to define the resolver and its functions.

The preferred method is to use the class file method, as it allows for better code completion and type checking as well as better structured code. Additional decorators will be added in the future to allow for more advanced features.

Many of the existing resolvers are JSON objects, but they will be converted to class files in the future.