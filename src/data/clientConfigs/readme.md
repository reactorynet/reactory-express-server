# Client Configuration
This folder contains all the client configuration you want to make available to your applications that consume the API.  The client configuration can be seen as a configuration for a tenant / white labelled version of the platform.

## Source Control

Please note, no client configuration must be checked in except for the base reactory client configuration. All other client configurations must be managed under their own source control and checked out into the client configuration.

## Configuration Files
The configuration files can be written in js, or ts files.

The __index.ts will be automatically generated at start based on the enabled clients json file.