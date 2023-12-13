# Hello World
This program must print in the console
```
> Hello World!
```

We will use a Reactory X Script to complete this.

```rxs
@print("Hello World")
```

Or use a reference to a Reactory X Script to execute the program
```rxs
run ./scripts/HelloWorld.rxs
```

Or import the module
```rxs
use ./scripts/HelloWorld.rxs
use ./scripts/HelloWorld.rxs as H2

@HelloWorld
//or
@H2
```

