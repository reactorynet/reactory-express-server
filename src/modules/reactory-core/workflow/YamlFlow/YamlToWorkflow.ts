import { join } from 'path';
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
 * Load a YAML workflow file and convert it to an IWorkflow definition.
 * Logs warnings/errors but does not throw — failed workflows are skipped.
 */
function loadYamlWorkflow(nameSpace: string, name: string, filename: string, version: string = '1.0.0'): Reactory.Workflow.IWorkflow | null {
    const parser = new YamlFlowParser();
    const { REACTORY_DATA } = process.env;
    const filePath = join(REACTORY_DATA as string, 'workflows', 'catalog', nameSpace, name, version,  filename);

    try {
        const result = parser.parseFromFile(filePath);

        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach((w) => {
                logger.warn(`[SocialEyes Workflow] Warning in ${filename}: ${w.message}`);
            });
        }

        if (!result.success || !result.workflow) {
            if (result.errors) {
                result.errors.forEach((e) => {
                    logger.error(`[SocialEyes Workflow] Error in ${filename}: ${e.message}`);
                });
            }
            logger.error(`[SocialEyes Workflow] Failed to parse ${filename}, skipping.`);
            return null;
        }

         return yamlToWorkflow(result.workflow, filePath);
    } catch (error) {
        logger
        .error(`[SocialEyes Workflow] Exception loading ${filename}:`, error);
        return null;
    }
}

export { loadYamlWorkflow };