# Reactory CLI Executable

## Overview

The `reactory` executable provides a unified command-line interface for all Reactory operations, including code generation, module management, and workflow execution.

## Installation

After running `npm install` or `yarn install`, the `reactory` executable will be available in your project's `node_modules/.bin/` directory.

### Global Installation (Optional)

To make the `reactory` command available globally:

```bash
npm link
# or
yarn link
```

## Usage

### Basic Syntax

```bash
reactory <command> [options]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `service-gen` | Generate TypeScript services from YAML definitions |
| `module-gen` | Generate a new Reactory module structure |
| `workflow` | Execute workflow-related commands |
| `list [module]` | List available commands for a module |
| `modules` | List all available modules |
| `help` | Show help message |

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--cname=<name>` | Configuration name | `reactory` |
| `--cenv=<env>` | Configuration environment | `local` |
| `--debug` | Enable debug mode | `false` |
| `--watch` | Enable watch mode | `false` |
| `--verbose`, `-v` | Enable verbose output | `false` |
| `-h`, `--help` | Show help message | - |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACTORY_CONFIG_NAME` | Default configuration name | `reactory` |
| `REACTORY_CONFIG_ENV` | Default configuration environment | `local` |

## Examples

### Service Generation

```bash
# Generate service from YAML definition
reactory service-gen -c ./service.yaml -o ./generated

# Generate multiple services from directory
reactory service-gen -d ./services/ -o ./generated

# Generate with tests and README
reactory service-gen -c ./service.yaml -o ./src/services --generateTests --generateReadme

# Use specific configuration
reactory service-gen -c ./service.yaml --cname=production --cenv=staging
```

### Module Generation

```bash
# Generate a new module
reactory module-gen --name MyModule --namespace myapp

# Generate with verbose output
reactory module-gen --name MyModule --namespace myapp --verbose
```

### Listing Commands

```bash
# List all available commands
reactory list

# List commands for specific module
reactory list reactory-core

# List all modules
reactory modules
```

### Debug Mode

```bash
# Run with debugging enabled
reactory service-gen -c ./service.yaml --debug

# Run in watch mode (auto-reload on file changes)
reactory service-gen -c ./service.yaml --watch
```

## Script Details

### How It Works

1. **Environment Setup**: Loads configuration from `config/<cname>/.env.<cenv>`
2. **Node Path**: Sets `NODE_PATH` to `./src` for module resolution
3. **Execution**: Runs the CLI via `babel-node` with the appropriate presets
4. **Arguments**: Passes all command arguments to the underlying CLI system

### File Structure

```
bin/
├── reactory           # Main executable
├── cli.sh             # Legacy CLI wrapper (still supported)
└── ...

src/
└── reactory/
    └── cli/
        ├── index.ts   # CLI entry point
        └── cli.ts     # CLI implementation
```

## Legacy Support

The existing `bin/cli.sh` script is still supported and works identically:

```bash
# These are equivalent
reactory service-gen -c ./service.yaml
bin/cli.sh service-gen -c ./service.yaml
```

## Configuration Files

The executable expects configuration files in the following structure:

```
config/
└── <config-name>/
    └── .env.<environment>
```

Example:
- `config/reactory/.env.local`
- `config/reactory/.env.development`
- `config/production/.env.production`

## Troubleshooting

### Command Not Found

If `reactory` command is not found:

1. Ensure you've run `npm install` or `yarn install`
2. Try running directly: `./bin/reactory <command>`
3. For global access, run `npm link` or `yarn link`

### Environment File Not Found

```
Error: Environment file not found: config/reactory/.env.local
```

**Solution**: Create the configuration file or specify a different config:
```bash
reactory service-gen -c ./service.yaml --cname=myconfig --cenv=dev
```

### Module Not Found Errors

Ensure all dependencies are installed:
```bash
npm install
# or
yarn install
```

## Development

### Modifying the Executable

The executable is located at `bin/reactory`. After making changes:

1. Ensure it remains executable: `chmod +x bin/reactory`
2. Test locally: `./bin/reactory help`
3. For global testing: `npm link` then `reactory help`

### Adding New Commands

Commands are defined in module CLI definitions:
1. Create CLI command in `src/modules/<module>/cli/`
2. Register in module's `index.ts`
3. Command will automatically be available via `reactory` executable

## Related Documentation

- [Service Generator](../src/modules/reactory-core/services/generators/service/README.md)
- [Module Generator](../src/modules/reactory-core/services/generators/module/README.md)
- [CLI System](../src/reactory/cli/README.md)

---

**Version:** 1.1.0  
**License:** MIT
