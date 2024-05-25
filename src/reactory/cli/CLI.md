# Reactory CLI Documentation

## Overview
The Reactory CLI provides a set of commands to manage and interact with the Reactory platform. This document outlines the available commands and their usage.

## Commands

### General Options
- `-h, --help`
  - Description: Displays the help message.
  
- `-l, --list [module]`
  - Description: Lists commands available. Providing a module will filter results to that specific module.

### Configuration Options
- `--cname`
  - Description: Specifies the configuration name.
  - Default: `reactory`
  
- `--cenv`
  - Description: Specifies the environment name.
  - Default: `local`
  
### Command-Specific Options
- `-p, --partner`
  - Description: The partner to use for the command.
  
- `-u, --user`
  - Description: The user to use for the command.
  
- `-pwd, --password`
  - Description: The password to use for the command.

### Listing available modules
- `--modules`
  - Description: Lists all the modules available.

## Usage Example
To start the Reactory AI bot reactor and use the command line, use the following command:

```sh
cli.sh reactor -p=reactory -u=reactory@local -pwd=Password123! --cenv=local --cname=reactory
```

This command will:
- Use `reactor` as the command.
- Set the partner to `reactory`.
- Use `reactory@local` as the user.
- Set `Password123!` as the password.
- Specify `local` as the environment.
- Use `reactory` as the configuration name.