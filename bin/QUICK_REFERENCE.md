# Reactory CLI Quick Reference

## Installation & Setup

```bash
# Install dependencies
npm install
# or
yarn install

# Make reactory available globally (optional)
npm link
# or
yarn link
```

## Common Commands

### Service Generation

```bash
# Generate from YAML
reactory service-gen -c service.yaml -o ./generated

# Generate with tests & docs
reactory service-gen -c service.yaml -o ./generated --generateTests --generateReadme

# Batch generate
reactory service-gen -d ./services -o ./generated
```

### Module Management

```bash
# Create new module
reactory module-gen --name MyModule --namespace myapp

# List all modules
reactory modules

# List module commands
reactory list reactory-core
```

### Development

```bash
# Watch mode (auto-reload)
reactory service-gen -c service.yaml --watch

# Debug mode
reactory service-gen -c service.yaml --debug

# Verbose output
reactory service-gen -c service.yaml --verbose
```

## Configuration

### Environment Files

Location: `config/<name>/.env.<environment>`

Example: `config/reactory/.env.local`

### Override Defaults

```bash
# Use different config
reactory service-gen -c service.yaml --cname=production --cenv=staging

# Or set environment variables
export REACTORY_CONFIG_NAME=production
export REACTORY_CONFIG_ENV=staging
reactory service-gen -c service.yaml
```

## Aliases

```bash
# These are equivalent:
reactory help
reactory --help
reactory -h

./bin/reactory help
./bin/cli.sh help
bin/cli.sh help
```

## Troubleshooting

### Command not found
```bash
# Use relative path
./bin/reactory help

# Or install globally
npm link
```

### Config file not found
```bash
# Check config exists
ls config/reactory/.env.local

# Or specify different config
reactory <cmd> --cname=myconfig --cenv=dev
```

### Need more help?
```bash
reactory help
reactory list
```

---

For detailed documentation, see:
- [bin/README_REACTORY_CLI.md](./README_REACTORY_CLI.md)
- [Service Generator README](../src/modules/reactory-core/services/generators/service/README.md)
