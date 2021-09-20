# Modules

This section covers the modules configuration and folder structure.

## Module loading
The reactory server uses a list of enabled modules and aggregates the services, forms, models, workflows at startup.  The configuration is set using the 

## Important Notice
All folders and files in the modules folder is ignored by the parent git repo, with the exception of the /core module.

Modules will be kept in their own repo and will have to downloaded into the modules folder

Modules cannot have conflicting names thus if you plan to make your modules available for publishing 
please ensure you your module does not use an already taken name.  

Where names conflict a custom remapping will have to be done as a work around but this is not guaranteed to work.

You will need an enabled<key>.json file that represent the available config

## NOTE: modules/__index.ts
The __index.ts is generated at runtime. Do not make any modifications to the file as it will be overwritten each time the server restarts.

The file is generated using the modules configured in the enabled modules key file.  This means you can have multiple different configuration combinations for modules.