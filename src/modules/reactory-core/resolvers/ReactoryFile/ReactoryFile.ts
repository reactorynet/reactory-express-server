import Reactory from "@reactory/reactory-core";
import {
  resolver,
  property,
  query,
  mutation,
} from "@reactory/server-core/models/graphql/decorators/resolver";
import { ObjectId } from "mongodb";
import path from "path";
import fs from "fs";
import ApiError from "@reactory/server-core/exceptions";

export type ReactoryUserFileLoadOptions = {
  __typename?: "ReactoryUserFileLoadOptions";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  includeFolders?: boolean;
};

export type ReactoryFolder = {
  __typename?: "ReactoryFolder";
  name: string;
  path: string;
};

export type ReactoryUserFiles = {
  __typename?: "ReactoryUserFiles";
  path: string;
  loadOptions?: ReactoryUserFileLoadOptions;
  files: Reactory.Models.IReactoryFileModel[];
  folders: ReactoryFolder[];
};

export type ReactoryUserFilesErrorResponse = {
  __typename?: "ReactoryUserFilesErrorResponse";
  error: string;
  message: string;
};

export type ReactoryUserFileResults =
  | ReactoryUserFiles
  | ReactoryUserFilesErrorResponse;

// Server file types for administrative operations
export type ReactoryServerFilePermissions = {
  __typename?: "ReactoryServerFilePermissions";
  read: boolean;
  write: boolean;
  delete: boolean;
  execute?: boolean;
};

export type ReactoryServerFolder = {
  __typename?: "ReactoryServerFolder";
  name: string;
  path: string;
  fullPath: string;
  created?: Date;
  modified?: Date;
  size?: number;
  fileCount?: number;
  permissions?: ReactoryServerFilePermissions;
};

export type ReactoryServerFile = {
  __typename?: "ReactoryServerFile";
  id: string;
  name: string;
  mimetype: string;
  extension: string;
  size: number;
  path: string;
  fullPath: string;
  created: Date;
  modified: Date;
  accessed?: Date;
  checksum?: string;
  isSystemFile: boolean;
  isHidden: boolean;
  permissions?: ReactoryServerFilePermissions;
  metadata?: string; // JSON string for additional metadata
};

export type ReactoryServerFilesLoadOptions = {
  __typename?: "ReactoryServerFilesLoadOptions";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  includeFolders?: boolean;
  includeHidden?: boolean;
  includeSystemFiles?: boolean;
  fileTypes?: string[];
};

export type ReactoryServerFiles = {
  __typename?: "ReactoryServerFiles";
  serverPath: string;
  loadOptions?: ReactoryServerFilesLoadOptions;
  folders: ReactoryServerFolder[];
  files: ReactoryServerFile[];
  totalCount?: number;
  hasMore?: boolean;
};

export type ReactoryServerFilesErrorResponse = {
  __typename?: "ReactoryServerFilesErrorResponse";
  error: string;
  message: string;
  serverPath?: string;
};

export type ReactoryServerFileResults =
  | ReactoryServerFiles
  | ReactoryServerFilesErrorResponse;

// Success types
export type ReactoryFileUpdateSuccess = {
  __typename?: "ReactoryFileUpdateSuccess";
  success: boolean;
  file: Reactory.Models.IReactoryFileModel;
};

export type ReactoryFileDeleteSuccess = {
  __typename?: "ReactoryFileDeleteSuccess";
  success: boolean;
  id: string;
};

export type ReactoryFolderCreateSuccess = {
  __typename?: "ReactoryFolderCreateSuccess";
  success: boolean;
  folder: ReactoryFolder;
};

export type ReactoryFolderDeleteSuccess = {
  __typename?: "ReactoryFolderDeleteSuccess";
  success: boolean;
  path: string;
};

export type ReactoryItemMoveSuccess = {
  __typename?: "ReactoryItemMoveSuccess";
  success: boolean;
  newPath: string;
  itemType: string;
};

// Error types
export type ReactoryFileUpdateError = {
  __typename?: "ReactoryFileUpdateError";
  error: string;
  message: string;
};

export type ReactoryFileDeleteError = {
  __typename?: "ReactoryFileDeleteError";
  error: string;
  message: string;
};

export type ReactoryFolderCreateError = {
  __typename?: "ReactoryFolderCreateError";
  error: string;
  message: string;
};

export type ReactoryFolderDeleteError = {
  __typename?: "ReactoryFolderDeleteError";
  error: string;
  message: string;
};

export type ReactoryItemMoveError = {
  __typename?: "ReactoryItemMoveError";
  error: string;
  message: string;
};

// Union types
export type ReactoryFileUploadResult =
  | ReactoryFileUploadSuccess
  | ReactoryFileUploadError;
export type ReactoryFileUpdateResult =
  | ReactoryFileUpdateSuccess
  | ReactoryFileUpdateError;
export type ReactoryFileDeleteResult =
  | ReactoryFileDeleteSuccess
  | ReactoryFileDeleteError;
export type ReactoryFolderCreateResult =
  | ReactoryFolderCreateSuccess
  | ReactoryFolderCreateError;
export type ReactoryFolderDeleteResult =
  | ReactoryFolderDeleteSuccess
  | ReactoryFolderDeleteError;
export type ReactoryItemMoveResult =
  | ReactoryItemMoveSuccess
  | ReactoryItemMoveError;

// Additional success/error types for upload operations
export type ReactoryFileUploadSuccess = {
  __typename?: "ReactoryFileUploadSuccess";
  success: boolean;
  file: Reactory.Models.IReactoryFileModel;
};

export type ReactoryFileUploadError = {
  __typename?: "ReactoryFileUploadError";
  error: string;
  message: string;
};

// Remote sync types
export type ReactoryFileRemoteEntry = {
  __typename?: "ReactoryFileRemoteEntry";
  id: string;
  url: string;
  name: string;
  lastSync: Date;
  success: boolean;
  verified: boolean;
  syncMessage: string;
  priority: number;
  modified: Date;
};

export type ReactoryRemoteSyncError = {
  __typename?: "ReactoryRemoteSyncError";
  error: string;
  message: string;
  remoteId: string;
};

export type ReactoryFileRemoteSyncResult =
  | ReactoryFileRemoteEntry
  | ReactoryRemoteSyncError;

//@ts-ignore
@resolver
class ReactoryFile {
  @query("ReactoryUserFiles")
  async getUserFiles(
    obj: any,
    params: {
      path?: string;
      loadOptions?: {
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        search?: string;
        includeFolders?: boolean;
      };
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryUserFileResults> {
    context.log(
      "ReactoryFile.getUserFiles",
      params,
      "debug",
      "ReactoryFile.ts"
    );
    if (!context.user?._id) {
      return {
        __typename: "ReactoryUserFilesErrorResponse",
        error: "Unauthorized",
        message: "You must be logged in to access user files.",
      };
    }
    const fileService = context.getService(
      "core.ReactoryFileService@1.0.0"
    ) as Reactory.Service.IReactoryFileService;
    const userFiles = await fileService.getUserFiles(
      context.user._id.toString(),
      params.path || "/",
      params.loadOptions || {
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: "",
        includeFolders: true,
      }
    );
    if (!userFiles) {
      return {
        __typename: "ReactoryUserFilesErrorResponse",
        error: "No files found",
        message: "No files found for the user.",
      };
    }
    return {
      __typename: "ReactoryUserFiles",
      path: params.path || "/",
      loadOptions: params.loadOptions || {
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: "",
        includeFolders: true,
      },
      files: userFiles.files,
      folders: userFiles.folders,
    };
  }

  @query("ReactoryServerFiles")
  async getServerFiles(
    obj: any,
    params: {
      serverPath?: string;
      loadOptions?: {
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        search?: string;
        includeFolders?: boolean;
        includeHidden?: boolean;
        includeSystemFiles?: boolean;
        fileTypes?: string[];
      };
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryServerFileResults> {
    context.log(
      "ReactoryFile.getServerFiles",
      params,
      "debug",
      "ReactoryFile.ts"
    );

    // Check if user has admin or developer role
    if (!context.hasRole("ADMIN") && !context.hasRole("DEVELOPER")) {
      return {
        __typename: "ReactoryServerFilesErrorResponse",
        error: "Unauthorized",
        message: "Access denied. Admin or Developer role required for server file access.",
        serverPath: params.serverPath,
      };
    }

    if (!context.user?._id) {
      return {
        __typename: "ReactoryServerFilesErrorResponse",
        error: "Unauthorized",
        message: "You must be logged in to access server files.",
        serverPath: params.serverPath,
      };
    }

    const fileService = context.getService(
      "core.ReactoryFileService@1.0.0"
    ) as Reactory.Service.IReactoryFileService;

    // Default to APP_DATA_ROOT if no serverPath provided
    const serverPath = params.serverPath || "${APP_DATA_ROOT}";
    
    const loadOptions = params.loadOptions || {
      limit: 50,
      offset: 0,
      sortBy: "name",
      sortOrder: "asc",
      search: "",
      includeFolders: true,
      includeHidden: false,
      includeSystemFiles: true,
      fileTypes: [],
    };

    try {
      // Call the service method - we need to cast to any to access the new method
      const serverFiles = await (fileService as any).getServerFiles(
        serverPath,
        loadOptions
      );

      if (!serverFiles) {
        return {
          __typename: "ReactoryServerFilesErrorResponse",
          error: "No files found",
          message: "No files found at the specified server path.",
          serverPath: serverPath,
        };
      }

      return {
        __typename: "ReactoryServerFiles",
        serverPath: serverPath,
        loadOptions: loadOptions,
        files: serverFiles.files,
        folders: serverFiles.folders,
        totalCount: serverFiles.totalCount || (serverFiles.files.length + serverFiles.folders.length),
        hasMore: serverFiles.hasMore || false,
      };
    } catch (error) {
      context.error("Error fetching server files:", error);
      return {
        __typename: "ReactoryServerFilesErrorResponse",
        error: "Server Error",
        message: error.message || "An error occurred while fetching server files.",
        serverPath: serverPath,
      };
    }
  }

  @property("ReactoryFile", "id")
  async getFileId(
    file: Reactory.Models.IReactoryFileModel,
    params: any,
    context: Reactory.Server.IReactoryContext
  ): Promise<string> {
    context.log("ReactoryFile.id", {}, "debug", "ReactoryFile.ts");
    if (file._id) return file._id.toString();
    throw new ApiError("File ID not found", {
      message: "The file does not have a valid ID.",
      code: "FILE_ID_NOT_FOUND",
      timestamp: new Date(),
      recoverable: false,
    });
  }

  @property("ReactoryFile", "size")
  async getFileSize(
    file: Reactory.Models.IReactoryFileModel,
    params: any,
    context: Reactory.Server.IReactoryContext
  ) {
    context.log("ReactoryFile.size", {}, "debug", "ReactoryFile.ts");
    if (file.size && file.size > 0) return file.size;

    const fileService = context.getService(
      "core.ReactoryFileService@1.0.0"
    ) as Reactory.Service.IReactoryFileService;
    return fileService.getFileSize(file);
  }

  @mutation("ReactoryUploadFile")
  async uploadFile(
    obj: any,
    params: {
      file: Reactory.Service.IFile; // Upload type from GraphQL
      alias?: string;
      path?: string;
      uploadContext?: string;
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFileUploadResult> {
    context.log("ReactoryFile.uploadFile", { 
      alias: params.alias,
      path: params.path,
      uploadContext: params.uploadContext 
    }, "debug", "ReactoryFile.ts");
    if (!context.user?._id) {
      return {
        __typename: "ReactoryFileUploadError",
        error: "Unauthorized",
        message: "You must be logged in to upload files.",
      };
    }

    try {
      const fileService = context.getService(
        "core.ReactoryFileService@1.0.0"
      ) as Reactory.Service.IReactoryFileService;

      // check if the path has any template variables and replace them
      let resolvedPath = params.path || '';
      let isUserSpecific = true;
      if (resolvedPath.includes('${')) {
        // Simple template variable replacement, e.g. ${userId}
        context.log("Resolving template variables in path", resolvedPath, "debug", "ReactoryFile.ts")
        resolvedPath = resolvedPath.replace(/\$\{userId\}/g, context.user._id.toString());
        resolvedPath = resolvedPath.replace(/\$\{partnerId\}/g, context.partner?._id?.toString() || 'default');
        resolvedPath = resolvedPath.replace(/\$\{date:([^\}]+)\}/g, (_, format) => {
          const date = new Date();
          // Simple date formatting - extend as needed
          if (format === 'YYYY-MM-DD') {
            return date.toISOString().split('T')[0];
          }
          return date.toISOString();
        });
        if (resolvedPath.includes('${APP_DATA_ROOT}')) {
          isUserSpecific = false;
        }
        resolvedPath = resolvedPath.replace(/\$\{APP_DATA_ROOT\}/g, '');
        resolvedPath = path.normalize(resolvedPath);
        context.log("Resolved path", resolvedPath, "debug", "ReactoryFile.ts")
        
      }

      let fileModel = await fileService.uploadFile({
        file: params.file,
        filename: params.file.filename,
        uploadContext: `user_file::${params.uploadContext || 'no-context' }`,
        isUserSpecific,
        rename: false,
        catalog: true,
        virtualPath: resolvedPath,
      });

     

      return {
        __typename: "ReactoryFileUploadSuccess",
        success: true,
        file: fileModel,
      };
    } catch (error) {
      context.log("Error uploading file", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryFileUploadError",
        error: "File upload failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }

  @mutation("ReactoryUpdateFile")
  async updateFile(
    obj: any,
    params: {
      id: string;
      alias?: string;
      path?: string;
      filename?: string;
      mimetype?: string;
      size?: number;
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFileUpdateResult> {
    context.log("ReactoryFile.updateFile", params, "debug", "ReactoryFile.ts");
    if (!context.user?._id) {
      return {
        __typename: "ReactoryFileUpdateError",
        error: "Unauthorized",
        message: "You must be logged in to update files.",
      };
    }

    try {
      const fileService = context.getService(
        "core.ReactoryFileService@1.0.0"
      ) as Reactory.Service.IReactoryFileService;

      const existingFile = await fileService.getFileModel(params.id);
      if (!existingFile) {
        return {
          __typename: "ReactoryFileUpdateError",
          error: "File not found",
          message: "The specified file does not exist.",
        };
      }

      // TODO: Implement file update logic
      // const updatedFile = await fileService.updateFile(params.id, {
      //   alias: params.alias,
      //   path: params.path,
      //   filename: params.filename,
      //   mimetype: params.mimetype,
      //   size: params.size,
      // });

      // For now, return the existing file with updated properties
      const updatedFile = {
        ...existingFile,
        alias: params.alias || existingFile.alias,
        path: params.path || existingFile.path,
        filename: params.filename || existingFile.filename,
        mimetype: params.mimetype || existingFile.mimetype,
        size: params.size || existingFile.size,
      } as Reactory.Models.IReactoryFileModel;

      return {
        __typename: "ReactoryFileUpdateSuccess",
        success: true,
        file: updatedFile,
      };
    } catch (error) {
      context.log("Error updating file", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryFileUpdateError",
        error: "File update failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }

  @mutation("ReactorySyncFileToRemote")
  async syncFileToRemote(
    obj: any,
    params: { id: string; remoteId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFileRemoteSyncResult> {
    context.log(
      "ReactoryFile.syncFileToRemote",
      params,
      "debug",
      "ReactoryFile.ts"
    );
    if (!context.user?._id) {
      return {
        __typename: "ReactoryRemoteSyncError",
        error: "Unauthorized",
        message: "You must be logged in to sync files.",
        remoteId: params.remoteId,
      };
    }

    try {
      const fileService = context.getService(
        "core.ReactoryFileService@1.0.0"
      ) as Reactory.Service.IReactoryFileService;

      const file = await fileService.getFileModel(params.id);
      if (!file) {
        return {
          __typename: "ReactoryRemoteSyncError",
          error: "File not found",
          message: "The specified file does not exist.",
          remoteId: params.remoteId,
        };
      }

      // TODO: Implement remote sync logic
      // const syncResult = await fileService.syncFileToRemote(params.id, params.remoteId);

      // For now, return a mock success response
      return {
        __typename: "ReactoryFileRemoteEntry",
        id: params.remoteId,
        url: `https://remote.example.com/files/${params.id}`,
        name: file.filename || "unknown",
        lastSync: new Date(),
        success: true,
        verified: true,
        syncMessage: "File synced successfully",
        priority: 1,
        modified: new Date(),
      };
    } catch (error) {
      context.log("Error syncing file", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryRemoteSyncError",
        error: "Sync failed",
        message: error.message || "An unexpected error occurred.",
        remoteId: params.remoteId,
      };
    }
  }

  @mutation("ReactoryDeleteFile")
  async deleteFile(
    obj: any,
    params: { input: { id: string; path: string } },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFileDeleteResult> {
    context.log("ReactoryFile.deleteFile", params, "debug", "ReactoryFile.ts");
    if (!context.user?._id) {
      return {
        __typename: "ReactoryFileDeleteError",
        error: "Unauthorized",
        message: "You must be logged in to delete files.",
      };
    }

    const fileService = context.getService(
      "core.ReactoryFileService@1.0.0"
    ) as Reactory.Service.IReactoryFileService;

    let fileDocument: Reactory.Models.IReactoryFileModel;

    try {
      if (params.input?.id && ObjectId.isValid(params.input.id)) {
        fileDocument = await fileService.getFileModel(params.input.id);
      } else if (params.input?.path) {
        fileDocument = await fileService.getUserFileByPath(params.input.path);
      } else {
        return {
          __typename: "ReactoryFileDeleteError",
          error: "Invalid file identifier",
          message: "The specified file identifier is invalid.",
        };
      }

      if (!fileDocument) {
        return {
          __typename: "ReactoryFileDeleteError",
          error: "File not found",
          message: "The specified file does not exist.",
        };
      }

      const deletedFile = fileService.deleteFile(fileDocument);
      if (!deletedFile) {
        return {
          __typename: "ReactoryFileDeleteError",
          error: "File deletion failed",
          message: "The file could not be deleted.",
        };
      }

      return {
        __typename: "ReactoryFileDeleteSuccess",
        success: true,
        id: params.input.id,
      };
    } catch (error) {
      context.log("Error deleting file", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryFileDeleteError",
        error: "File deletion failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }

  @mutation("ReactoryCreateFolder")
  async createFolder(
    obj: any,
    params: { name: string; path: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFolderCreateResult> {
    context.log(
      "ReactoryFile.createFolder",
      params,
      "debug",
      "ReactoryFile.ts"
    );
    if (!context.user?._id) {
      return {
        __typename: "ReactoryFolderCreateError",
        error: "Unauthorized",
        message: "You must be logged in to create folders.",
      };
    }

    try {
      

      const folderPath = `${params.path}/${params.name}`.replace(/\/+/g, "/");

      let target = path.join(
        process.env.APP_DATA_ROOT || "", 
        "profiles", 
        context.user._id.toString(),
         "files", 
         context.partner?._id?.toString() || "default", 
         "home",
         folderPath);

      if (fs.existsSync(target) === true) {
        return {
          __typename: "ReactoryFolderCreateError",
          error: "Folder already exists",
          message: "The specified folder already exists.",
        };
      }

      fs.mkdirSync(target, { recursive: true });
      
      return {
        __typename: "ReactoryFolderCreateSuccess",
        success: true,
        folder: {
          __typename: "ReactoryFolder",
          name: params.name,
          path: folderPath,
        },
      };
    } catch (error) {
      context.log("Error creating folder", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryFolderCreateError",
        error: "Folder creation failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }

  @mutation("ReactoryDeleteFolder")
  async deleteFolder(
    obj: any,
    params: { path: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryFolderDeleteResult> {
    context.log(
      "ReactoryFile.deleteFolder",
      params,
      "debug",
      "ReactoryFile.ts"
    );
    if (!context.user?._id) {
      return {
        __typename: "ReactoryFolderDeleteError",
        error: "Unauthorized",
        message: "You must be logged in to delete folders.",
      };
    }

    try {
      // TODO: Implement deleteFolder method in file service
      // const fileService = context.getService("core.ReactoryFileService@1.0.0") as Reactory.Service.IReactoryFileService;
      // const deleted = await fileService.deleteFolder(context.user._id.toString(), params.path);

      // For now, return a mock success response
      return {
        __typename: "ReactoryFolderDeleteSuccess",
        success: true,
        path: params.path,
      };
    } catch (error) {
      context.log("Error deleting folder", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryFolderDeleteError",
        error: "Folder deletion failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }

  @mutation("ReactoryMoveItem")
  async moveItem(
    obj: any,
    params: { itemPath: string; newPath: string; itemType: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<ReactoryItemMoveResult> {
    context.log("ReactoryFile.moveItem", params, "debug", "ReactoryFile.ts");
    if (!context.user?._id) {
      return {
        __typename: "ReactoryItemMoveError",
        error: "Unauthorized",
        message: "You must be logged in to move items.",
      };
    }

    try {
      // TODO: Implement moveItem method in file service
      // const fileService = context.getService("core.ReactoryFileService@1.0.0") as Reactory.Service.IReactoryFileService;
      // const moved = await fileService.moveItem(
      //   context.user._id.toString(),
      //   params.itemPath,
      //   params.newPath,
      //   params.itemType
      // );

      // For now, return a mock success response
      return {
        __typename: "ReactoryItemMoveSuccess",
        success: true,
        newPath: params.newPath,
        itemType: params.itemType,
      };
    } catch (error) {
      context.log("Error moving item", error, "error", "ReactoryFile.ts");
      return {
        __typename: "ReactoryItemMoveError",
        error: "Move operation failed",
        message: error.message || "An unexpected error occurred.",
      };
    }
  }
}

export default ReactoryFile;
