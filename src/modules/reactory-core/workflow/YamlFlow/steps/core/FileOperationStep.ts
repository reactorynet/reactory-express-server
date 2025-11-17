/**
 * FileOperationStep - Perform file system operations
 * Supports reading, writing, copying, moving, and deleting files and directories
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';
import { promises as fs, constants } from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline as pipelineCallback } from 'stream';

const pipeline = promisify(pipelineCallback);

/**
 * Configuration interface for FileOperationStep
 */
export interface FileOperationStepConfig {
  /** Type of operation */
  operation: 'read' | 'write' | 'copy' | 'move' | 'delete' | 'mkdir' | 'rmdir' | 'exists' | 'stat' | 'list';
  
  /** Source path */
  path: string;
  
  /** Destination path (for copy/move operations) */
  destination?: string;
  
  /** Content to write (for write operations) */
  content?: string | Buffer;
  
  /** Encoding for text operations */
  encoding?: BufferEncoding;
  
  /** Options for the operation */
  options?: {
    /** Create parent directories if they don't exist */
    createParents?: boolean;
    
    /** Overwrite existing files */
    overwrite?: boolean;
    
    /** Recursive operations (for directory operations) */
    recursive?: boolean;
    
    /** File mode/permissions */
    mode?: number;
    
    /** Maximum file size to read (bytes) */
    maxSize?: number;
    
    /** Pattern for filtering files (glob pattern) */
    pattern?: string;
  };
  
  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for performing file system operations
 */
export class FileOperationStep extends BaseYamlStep {
  public readonly stepType = 'fileOperation';
  
  /**
   * Execute the file operation step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as FileOperationStepConfig;
    
    // Resolve template variables
    const resolvedConfig = this.resolveConfigTemplates(config, context);
    
    const startTime = Date.now();
    
    try {
      context.logger.debug(`Performing file operation: ${resolvedConfig.operation} on ${resolvedConfig.path}`);
      
      const result = await this.performOperation(resolvedConfig, context);
      const duration = Date.now() - startTime;
      
      context.logger.info(`File operation ${resolvedConfig.operation} completed in ${duration}ms`);
      
      return {
        success: true,
        outputs: {
          operation: resolvedConfig.operation,
          path: resolvedConfig.path,
          destination: resolvedConfig.destination,
          result
        },
        metadata: {
          duration,
          operation: resolvedConfig.operation,
          pathType: await this.getPathType(resolvedConfig.path)
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      context.logger.error(`File operation ${resolvedConfig.operation} failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        outputs: {
          operation: resolvedConfig.operation,
          path: resolvedConfig.path,
          destination: resolvedConfig.destination
        },
        metadata: {
          duration,
          operation: resolvedConfig.operation,
          errorCode: (error as any)?.code
        }
      };
    }
  }
  
  /**
   * Perform the file system operation
   * @param config - Resolved configuration
   * @param context - Execution context
   * @returns Operation result
   */
  private async performOperation(config: FileOperationStepConfig, context: StepExecutionContext): Promise<any> {
    switch (config.operation) {
      case 'read':
        return await this.readFile(config);
      
      case 'write':
        return await this.writeFile(config);
      
      case 'copy':
        return await this.copyFile(config);
      
      case 'move':
        return await this.moveFile(config);
      
      case 'delete':
        return await this.deleteFile(config);
      
      case 'mkdir':
        return await this.makeDirectory(config);
      
      case 'rmdir':
        return await this.removeDirectory(config);
      
      case 'exists':
        return await this.checkExists(config);
      
      case 'stat':
        return await this.getStats(config);
      
      case 'list':
        return await this.listDirectory(config);
      
      default:
        throw new Error(`Unknown file operation: ${config.operation}`);
    }
  }
  
  /**
   * Read file content
   * @param config - Configuration
   * @returns File content
   */
  private async readFile(config: FileOperationStepConfig): Promise<any> {
    const maxSize = config.options?.maxSize || 10 * 1024 * 1024; // 10MB default
    
    // Check file size first
    const stats = await fs.stat(config.path);
    if (stats.size > maxSize) {
      throw new Error(`File size (${stats.size}) exceeds maximum allowed size (${maxSize})`);
    }
    
    const encoding = config.encoding || 'utf8';
    const content = await fs.readFile(config.path, encoding);
    
    return {
      content,
      size: stats.size,
      encoding,
      lastModified: stats.mtime
    };
  }
  
  /**
   * Write file content
   * @param config - Configuration
   * @returns Write result
   */
  private async writeFile(config: FileOperationStepConfig): Promise<any> {
    if (!config.content) {
      throw new Error('Content is required for write operation');
    }
    
    // Create parent directories if needed
    if (config.options?.createParents) {
      const dir = path.dirname(config.path);
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Check if file exists and overwrite setting
    if (!config.options?.overwrite) {
      try {
        await fs.access(config.path, constants.F_OK);
        throw new Error('File exists and overwrite is not enabled');
      } catch (error) {
        // File doesn't exist, proceed
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    const encoding = config.encoding || 'utf8';
    const writeOptions: any = { encoding };
    
    if (config.options?.mode) {
      writeOptions.mode = config.options.mode;
    }
    
    await fs.writeFile(config.path, config.content, writeOptions);
    
    const stats = await fs.stat(config.path);
    
    return {
      bytesWritten: stats.size,
      encoding,
      mode: stats.mode,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }
  
  /**
   * Copy file or directory
   * @param config - Configuration
   * @returns Copy result
   */
  private async copyFile(config: FileOperationStepConfig): Promise<any> {
    if (!config.destination) {
      throw new Error('Destination is required for copy operation');
    }
    
    // Create parent directories if needed
    if (config.options?.createParents) {
      const dir = path.dirname(config.destination);
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Check if destination exists and overwrite setting
    if (!config.options?.overwrite) {
      try {
        await fs.access(config.destination, constants.F_OK);
        throw new Error('Destination exists and overwrite is not enabled');
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    const sourceStats = await fs.stat(config.path);
    
    if (sourceStats.isDirectory()) {
      // Copy directory recursively
      if (!config.options?.recursive) {
        throw new Error('Recursive option required for directory copy');
      }
      
      await this.copyDirectory(config.path, config.destination);
    } else {
      // Copy file
      await this.copyFileStreamOptimized(config.path, config.destination);
    }
    
    const destStats = await fs.stat(config.destination);
    
    return {
      sourceSize: sourceStats.size,
      destinationSize: destStats.size,
      isDirectory: sourceStats.isDirectory(),
      copied: destStats.birthtime
    };
  }
  
  /**
   * Move file or directory
   * @param config - Configuration
   * @returns Move result
   */
  private async moveFile(config: FileOperationStepConfig): Promise<any> {
    if (!config.destination) {
      throw new Error('Destination is required for move operation');
    }
    
    // Create parent directories if needed
    if (config.options?.createParents) {
      const dir = path.dirname(config.destination);
      await fs.mkdir(dir, { recursive: true });
    }
    
    const sourceStats = await fs.stat(config.path);
    
    try {
      // Try atomic rename first
      await fs.rename(config.path, config.destination);
    } catch (error) {
      // If rename fails (cross-device), copy then delete
      if ((error as any).code === 'EXDEV') {
        await this.copyFile({ ...config, operation: 'copy' });
        // Use rmdir for directories, unlink for files
        if (sourceStats.isDirectory()) {
          await fs.rmdir(config.path);
        } else {
          await fs.unlink(config.path);
        }
      } else {
        throw error;
      }
    }
    
    const destStats = await fs.stat(config.destination);
    
    return {
      size: destStats.size,
      isDirectory: destStats.isDirectory(),
      moved: destStats.mtime
    };
  }
  
  /**
   * Delete file or directory
   * @param config - Configuration
   * @returns Delete result
   */
  private async deleteFile(config: FileOperationStepConfig): Promise<any> {
    const stats = await fs.stat(config.path);
    
    if (stats.isDirectory()) {
      if (config.options?.recursive) {
        // Recursively delete directory contents first
        await this.deleteDirectoryRecursive(config.path);
      }
      await fs.rmdir(config.path);
    } else {
      await fs.unlink(config.path);
    }
    
    return {
      deleted: true,
      wasDirectory: stats.isDirectory(),
      size: stats.size,
      deletedAt: new Date()
    };
  }
  
  /**
   * Create directory
   * @param config - Configuration
   * @returns Directory creation result
   */
  private async makeDirectory(config: FileOperationStepConfig): Promise<any> {
    const options: any = {};
    
    if (config.options?.recursive) {
      options.recursive = true;
    }
    
    if (config.options?.mode) {
      options.mode = config.options.mode;
    }
    
    await fs.mkdir(config.path, options);
    const stats = await fs.stat(config.path);
    
    return {
      created: true,
      mode: stats.mode,
      createdAt: stats.birthtime
    };
  }
  
  /**
   * Remove directory
   * @param config - Configuration
   * @returns Directory removal result
   */
  private async removeDirectory(config: FileOperationStepConfig): Promise<any> {
    if (config.options?.recursive) {
      // Recursively delete directory contents first
      await this.deleteDirectoryRecursive(config.path);
    }
    
    await fs.rmdir(config.path);
    
    return {
      removed: true,
      removedAt: new Date()
    };
  }
  
  /**
   * Check if path exists
   * @param config - Configuration
   * @returns Existence result
   */
  private async checkExists(config: FileOperationStepConfig): Promise<any> {
    try {
      await fs.access(config.path, constants.F_OK);
      const stats = await fs.stat(config.path);
      
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false
      };
    }
  }
  
  /**
   * Get file/directory statistics
   * @param config - Configuration
   * @returns File stats
   */
  private async getStats(config: FileOperationStepConfig): Promise<any> {
    const stats = await fs.stat(config.path);
    
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  }
  
  /**
   * List directory contents
   * @param config - Configuration
   * @returns Directory listing
   */
  private async listDirectory(config: FileOperationStepConfig): Promise<any> {
    const items = await fs.readdir(config.path, { withFileTypes: true });
    
    const files: any[] = [];
    const directories: any[] = [];
    
    for (const item of items) {
      const itemPath = path.join(config.path, item.name);
      
      // Apply pattern filter if specified
      if (config.options?.pattern) {
        const pattern = new RegExp(config.options.pattern.replace(/\*/g, '.*'));
        if (!pattern.test(item.name)) {
          continue;
        }
      }
      
      const stats = await fs.stat(itemPath);
      
      const itemInfo = {
        name: item.name,
        path: itemPath,
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        mode: stats.mode
      };
      
      if (item.isDirectory()) {
        directories.push(itemInfo);
      } else {
        files.push(itemInfo);
      }
    }
    
    return {
      path: config.path,
      files,
      directories,
      totalItems: files.length + directories.length,
      fileCount: files.length,
      directoryCount: directories.length
    };
  }
  
  /**
   * Copy file using streams for better performance with large files
   * @param source - Source path
   * @param destination - Destination path
   */
  private async copyFileStreamOptimized(source: string, destination: string): Promise<void> {
    await pipeline(
      createReadStream(source),
      createWriteStream(destination)
    );
  }
  
  /**
   * Copy directory recursively
   * @param source - Source directory
   * @param destination - Destination directory
   */
  private async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    
    const items = await fs.readdir(source, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const destPath = path.join(destination, item.name);
      
      if (item.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await this.copyFileStreamOptimized(sourcePath, destPath);
      }
    }
  }
  
  /**
   * Delete directory recursively
   * @param dirPath - Directory to delete
   */
  private async deleteDirectoryRecursive(dirPath: string): Promise<void> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        await this.deleteDirectoryRecursive(itemPath);
        await fs.rmdir(itemPath);
      } else {
        await fs.unlink(itemPath);
      }
    }
  }
  
  /**
   * Get path type (file, directory, or nonexistent)
   * @param filePath - Path to check
   * @returns Path type
   */
  private async getPathType(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory() ? 'directory' : 'file';
    } catch {
      return 'nonexistent';
    }
  }
  
  /**
   * Resolve template variables in configuration
   * @param config - Configuration to resolve
   * @param context - Execution context
   * @returns Resolved configuration
   */
  private resolveConfigTemplates(config: FileOperationStepConfig, context: StepExecutionContext): FileOperationStepConfig {
    const resolved: FileOperationStepConfig = { ...config };
    
    // Resolve paths
    resolved.path = this.resolveTemplate(config.path, context);
    
    if (config.destination) {
      resolved.destination = this.resolveTemplate(config.destination, context);
    }
    
    // Resolve content if it's a string
    if (typeof config.content === 'string') {
      resolved.content = this.resolveTemplate(config.content, context);
    }
    
    return resolved;
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!config.operation || typeof config.operation !== 'string') {
      errors.push('operation is required and must be a string');
    } else if (!['read', 'write', 'copy', 'move', 'delete', 'mkdir', 'rmdir', 'exists', 'stat', 'list'].includes(config.operation)) {
      errors.push('operation must be one of: read, write, copy, move, delete, mkdir, rmdir, exists, stat, list');
    }
    
    if (!config.path || typeof config.path !== 'string') {
      errors.push('path is required and must be a string');
    }
    
    // Operation-specific validation
    if (config.operation === 'copy' || config.operation === 'move') {
      if (!config.destination || typeof config.destination !== 'string') {
        errors.push(`destination is required for ${config.operation} operation`);
      }
    }
    
    if (config.operation === 'write') {
      if (config.content === undefined) {
        errors.push('content is required for write operation');
      }
    }
    
    // Options validation
    if (config.options && typeof config.options !== 'object') {
      errors.push('options must be an object');
    } else if (config.options) {
      if (config.options.mode && (typeof config.options.mode !== 'number' || config.options.mode < 0)) {
        errors.push('options.mode must be a non-negative number');
      }
      
      if (config.options.maxSize && (typeof config.options.maxSize !== 'number' || config.options.maxSize <= 0)) {
        errors.push('options.maxSize must be a positive number');
      }
      
      if (config.options.pattern && typeof config.options.pattern !== 'string') {
        errors.push('options.pattern must be a string');
      }
    }
    
    // Encoding validation
    if (config.encoding && typeof config.encoding !== 'string') {
      errors.push('encoding must be a string');
    }
    
    // Security warnings
    if (config.path && config.path.includes('..')) {
      warnings.push('path contains ".." which may access parent directories');
    }
    
    if (config.destination && config.destination.includes('..')) {
      warnings.push('destination contains ".." which may access parent directories');
    }
    
    if (config.operation === 'delete' && config.path === '/') {
      errors.push('cannot delete root directory');
    }
    
    if (config.operation === 'write' && config.options?.createParents) {
      warnings.push('createParents option may create unexpected directory structure');
    }
    
    if (config.options?.maxSize && config.options.maxSize > 100 * 1024 * 1024) { // 100MB
      warnings.push('maxSize is very large (>100MB), this may consume significant memory');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
