import { join, dirname } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { YamlFlowParser } from '@reactory/server-modules/reactory-core/workflow/YamlFlow';
import { YamlWorkflowDefinition } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/types/WorkflowDefinition';
import logger from '@reactory/server-core/logging';
/**
 * Convert a parsed YamlWorkflowDefinition to a Reactory.Workflow.IWorkflow
 * registration object for inclusion in the module's workflows array.
 * 
 * @param definition - The parsed YAML workflow definition.
 * @param absoluteFilePath - The absolute path to the YAML source file on disk.
 *   This is stored verbatim as `location` so the workflow service can find and
 *   copy the file into the $REACTORY_DATA catalog on startup.
 */
function yamlToWorkflow(definition: YamlWorkflowDefinition, absoluteFilePath: string): Reactory.Workflow.IWorkflow {
    return {
        id: `${definition.nameSpace}.${definition.name}@${definition.version}`,
        nameSpace: definition.nameSpace,
        name: definition.name,
        version: definition.version,
        description: definition.description,
        author: definition.author,
        tags: definition.tags,
        category: 'workflow',
        workflowType: 'YAML',
        location: absoluteFilePath,
        autoStart: false,
        props: definition, // Store the full YAML definition for execution engine access
    } as Reactory.Workflow.IWorkflow;
}

/**
 * Ensure a YAML workflow file exists in the catalog directory, copying it from
 * the module source directory if necessary.  Creates the target directory tree.
 *
 * @returns The absolute path to the YAML file in the catalog.
 */
function provisionCatalogFile(
    sourceDir: string,
    filename: string,
    catalogPath: string,
): void {
    const catalogDir = dirname(catalogPath);

    if (!existsSync(catalogDir)) {
        mkdirSync(catalogDir, { recursive: true });
    }

    if (!existsSync(catalogPath)) {
        const sourceFile = join(sourceDir, filename);
        if (existsSync(sourceFile)) {
            copyFileSync(sourceFile, catalogPath);
            logger.debug(`Provisioned workflow ${filename} → ${catalogPath}`);
        } else {
            logger.warn(`Source workflow file not found: ${sourceFile}`);
        }
    }
}

/**
 * Load a YAML workflow file and convert it to an IWorkflow definition.
 * Logs warnings/errors but does not throw — failed workflows are skipped.
 *
 * @param nameSpace - The workflow namespace.
 * @param name      - The workflow name.
 * @param filename  - The YAML filename (e.g. "MyWorkflow.yaml").
 * @param version   - Semantic version string (default "1.0.0").
 * @param sourceDir - **Optional** absolute path to the module directory that
 *   contains the YAML source files.  When provided, the file is automatically
 *   copied into the `$REACTORY_DATA/workflows/catalog/` tree the first time,
 *   creating the directory structure as needed.
 */
function loadYamlWorkflow(
    nameSpace: string,
    name: string,
    filename: string,
    version: string = '1.0.0',
    sourceDir?: string,
): Reactory.Workflow.IWorkflow | null {
    const parser = new YamlFlowParser();
    const { REACTORY_DATA } = process.env;
    const catalogPath = join(REACTORY_DATA as string, 'workflows', 'catalog', nameSpace, name, version, filename);

    // If a module source directory was given, ensure the file is in the catalog.
    if (sourceDir) {
        provisionCatalogFile(sourceDir, filename, catalogPath);
    }

    try {
        const result = parser.parseFromFile(catalogPath);

        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach((w) => {
                logger.warn(`[Workflow Loader] Warning in ${filename}: ${w.message}`);
            });
        }

        if (!result.success || !result.workflow) {
            if (result.errors) {
                result.errors.forEach((e) => {
                    logger.error(`[Workflow Loader] Error in ${filename}: ${e.message}`);
                });
            }
            logger.error(`[Workflow Loader] Failed to parse ${filename}, skipping.`);
            return null;
        }

         return yamlToWorkflow(result.workflow, catalogPath);
    } catch (error) {
        logger
        .error(`[Workflow Loader] Exception loading ${filename}:`, error);
        return null;
    }
}

export { loadYamlWorkflow };