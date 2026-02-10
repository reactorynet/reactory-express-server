# ServiceGen CLI Command

The ServiceGen CLI command has been successfully created and integrated into the Reactory CLI system.

## Overview

The ServiceGen CLI command generates TypeScript service classes from YAML definitions. It provides a comprehensive interface for:
- Validating service definitions
- Generating service code from templates
- Creating test files and documentation
- Batch processing multiple service definitions

## Status

✅ **CLI Command Created**: `src/modules/reactory-core/cli/service-gen/ServiceGen.ts`
✅ **Registered with CLI**: Added to `src/modules/reactory-core/cli/index.ts`
✅ **Integrated with Module**: Exported via `src/modules/reactory-core/index.ts`

## Usage

The ServiceGen command can be invoked using either:
- `./bin/cli.sh ServiceGen [options]`
- `reactory service-gen [options]` (after running `npm link`)

### Available Options

```bash
-c --config <yaml-file>           # Path to service definition YAML
-d --directory <path>             # Directory with multiple service.yaml files
-o --output <output-folder>       # Output directory (default: current dir)
-f --format <format>              # Output format: ts or js (default: ts)
--template <template-path>        # Custom EJS template file
--overwrite                       # Overwrite existing files
--generate-tests                  # Generate unit test files
--generate-readme                 # Generate README documentation
--dry-run                         # Validate without generating
-l --list-generators              # List all available generators
-v --verbose                      # Enable verbose output
-h --help                         # Show help message
```

### Examples

```bash
# Generate service from YAML
./bin/cli.sh ServiceGen -c ./service.yaml -o ./src/services

# Generate with tests and README
./bin/cli.sh ServiceGen -c ./service.yaml -o ./src/services --generate-tests --generate-readme

# Generate from directory
./bin/cli.sh ServiceGen -d ./services -o ./src/generated

# Dry run (validate only)
./bin/cli.sh ServiceGen -c ./service.yaml --dry-run

# List available generators
./bin/cli.sh ServiceGen -l
```

## Testing

The command has been tested and verified:

✅ Help output works: `./bin/cli.sh ServiceGen --help`
✅ List generators works: `./bin/cli.sh ServiceGen -l`
✅ Dry run validation works: `./bin/cli.sh ServiceGen -c test-sample-service.yaml --dry-run`
✅ Command registration verified in module system

## Integration with ServiceGenerator Service

The CLI command acts as a wrapper around the `core.ServiceGenerator@1.0.0` service, providing:
- Argument parsing and validation
- User-friendly error messages and output formatting
- Integration with the Reactory context system
- Support for both single-file and batch processing

## Files Created

1. **CLI Command**: `src/modules/reactory-core/cli/service-gen/ServiceGen.ts`
2. **Specification**: `src/modules/reactory-core/cli/service-gen/docs/specification.md`

## Next Steps

To use the command:
1. Create a service definition YAML file (see specification for schema)
2. Run the command with appropriate options
3. Review generated files in the output directory

For more details on the service definition schema and generated code structure, see:
- `/src/modules/reactory-core/services/generators/service/README.md`
- `/src/modules/reactory-core/cli/service-gen/docs/specification.md`
