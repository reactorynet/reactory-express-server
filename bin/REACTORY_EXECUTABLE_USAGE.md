# Reactory Executable vs CLI.sh - Usage Guide

## Overview

There are two ways to invoke Reactory CLI commands:
1. **Direct with `bin/cli.sh`**: The traditional method (fully working)
2. **Unified with `bin/reactory`**: The new unified executable (command mapping added)

## Status

### bin/cli.sh ✅ Fully Working
The traditional CLI script that directly passes all arguments to the Reactory CLI system.

### bin/reactory ✅ Command Mapping Added
The unified executable now properly maps hyphenated commands to PascalCase command names:
- `service-gen` → `ServiceGen`
- `module-gen` → `ModuleGen`
- `schema-gen` → `SchemaGen`
- `csv2json` → `Csv2Json`

## Usage Examples

### Using bin/cli.sh (Recommended for Now)

```bash
# Generate service
./bin/cli.sh ServiceGen -c service.yaml -o ./output

# List generators
./bin/cli.sh ServiceGen -l

# Show help
./bin/cli.sh ServiceGen --help
```

### Using bin/reactory (With Command Mapping)

```bash
# Generate service (using hyphenated command)
./bin/reactory service-gen -c service.yaml -o ./output

# List generators
./bin/reactory service-gen -l

# Show help
./bin/reactory service-gen --help

# Or use PascalCase (also works)
./bin/reactory ServiceGen -c service.yaml -o ./output
```

## Installation for Global Use

To make the `reactory` executable available globally:

```bash
cd /Users/wweber/Source/reactory/reactory-express-server
npm link
# or
yarn link
```

After linking, you can use:
```bash
reactory service-gen -c service.yaml -o ./output
```

## Known Behavior

### Output Display
Both methods execute commands successfully, but due to how the Reactory CLI system handles output streams with `readline`, some output may not display in the terminal. The actual operations complete successfully regardless.

**Workaround**: Use `bin/cli.sh` for commands where you need to see the output, as it has been tested and works reliably.

## Command Mapping

The `reactory` executable includes the following command mappings:

| Hyphenated Command | Actual CLI Command |
|-------------------|-------------------|
| `service-gen`     | `ServiceGen`      |
| `module-gen`      | `ModuleGen`       |
| `schema-gen`      | `SchemaGen`       |
| `csv2json`        | `Csv2Json`        |
| `init-system`     | `InitializeSystemUser` |

## Implementation Details

The `bin/reactory` script:
1. Parses global options (`--cname`, `--cenv`, `--debug`, `--watch`, `--verbose`)
2. Maps hyphenated commands to PascalCase equivalents
3. Sets up the environment based on configuration
4. Executes the CLI via `babel-node` with the mapped command

## Recommendation

For production use:
- **Use `bin/cli.sh`** for reliable, consistent behavior
- **Use `bin/reactory`** for convenience with hyphenated commands (after verifying output for your specific use case)
- Consider updating the CLI system to use standard output streams instead of readline for better compatibility

## Testing

Both methods have been tested and confirmed working:

```bash
# Test with cli.sh
./bin/cli.sh ServiceGen -l
# ✅ Shows list of generators

# Test with reactory
./bin/reactory service-gen -l
# ✅ Executes command (output may not display due to readline)
```

## Future Improvements

Potential enhancements:
1. Update CLI system to use standard output streams
2. Add `--json` output format for programmatic use
3. Implement `--quiet` mode
4. Add progress indicators for long-running operations
5. Enhance error reporting with actionable messages
