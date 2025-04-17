# Modules

This section covers the modules configuration and folder structure.

## Module loading
The reactory server uses a list of enabled modules and aggregates the services, forms, models, workflows at startup.  The configuration is set using a enabled-{setting_id}.json file.

The format of a module definition is as 

```json
[
  {
    "id": "reactory-core",
    "name": "ReactoryServer",
    "key": "reactory-core",
    "fqn": "core.ReactoryServer@1.0.0",
    "moduleEntry": "reactory-core/index.ts",
    "license": "Apache-2.0",
    "shop": "https://reactory.net/store/reactory-core/",
    "git": "git@github.com:/reactorynet/reactory-express-server.git",
    "description": "Reactory Server Core Module",
    "version": "1.1.0",
    "published": "2024-01-01",
    "rating": 5
  },
  
]
```

## Important Notice
All folders and files in the modules folder is ignored by the parent git repo, with the exception of the /reactory-core module.

Modules will be kept in their own repo and will have to downloaded into the modules folder

Modules cannot have conflicting names thus if you plan to make your modules available for publishing. We do not currently have a public list of module names aside from the core modules, however we will release a BETA of our public reactory registry api in the coming months.

it is advisable to prefix your module name with your company name or a unique identifier, for example: `acme-<module_name>` and to create a typescript mapping file to ensure that your module names do not conflict with other modules.

Where names conflict a custom remapping will have to be done as a work around but this is not guaranteed to work.

You will need an enabled<key>.json file that represent the available config


## NOTE: modules/__index.ts
The __index.ts is generated at runtime. Do not make any modifications to the file as it will be overwritten each time the server restarts.

The file is generated using the modules configured in the enabled modules key file.  This means you can have multiple different configuration combinations for modules.

This allows us to change our API configuration and shape of our graph using different modules being loaded.