
import fetch, { RequestInit, Response } from 'node-fetch';
import fs, { writeFile } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { ObjectID, ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Hash from '@reactory/server-core/utils/hash';
import { Reactory } from '@reactory/server-core/types/reactory';
import ApiError from '@reactory/server-core/exceptions';
import ReactoryFileModel from '@reactory/server-modules/core/models/CoreFile';
import logger from '@reactory/server-core/logging';

const {
    APP_DATA_ROOT,
    CDN_ROOT
} = process.env


const writeFilePromise = promisify(writeFile);

const getExtension = (filename: string) => {
    return filename.split('.').pop();
}

interface IFileDownloadResult {
    savedAs: string,
    original?: string,
    mimetype?: string,
    success?: boolean,
    error?: string,
    size?: number
}

const downloadFile = async (url: string, options?: RequestInit, outputPath?: string): Promise<IFileDownloadResult> => {

    let result: IFileDownloadResult = {
        savedAs: '',
        error: null,
        success: false,
        original: null,
        mimetype: null,
        size: 0,
    }

    try {
        let original = '';
        let filename = `${APP_DATA_ROOT}${outputPath || `/temp/${new ObjectID()}.download`}`;

        await fetch(url, options)
            .then((response: Response) => {
                response.headers.forEach((value, name) => {
                    logger.debug(`${name} -> ${value}`)
                    switch (name) {
                        case 'content-type': {
                            result.mimetype = value;                            
                            break
                        }
                        case 'content-length': {
                            result.size = parseInt(`${value}`, 10);
                            break;
                        }
                    }
                });
                
                return response.arrayBuffer()
            })
            .then((buff: ArrayBuffer) => writeFilePromise(filename, Buffer.from(buff)))
            .then()

        
        result.original = path.basename(url);
        result.success = true;
        result.savedAs = filename;

        return result;

    } catch (downloadError) {
        logger.error(`Could not download file ${url}`, downloadError);
        throw downloadError
    }
}

const catalogFile = async (filename: string, mimetype: string, alias: string, context: string = 'downloaded'): Promise<Reactory.IReactoryFileModel> => {
    // Check if image is valid
    const fileStats: fs.Stats = fs.statSync(filename);
    logger.debug(`SAVING FILE:: DONE ${fileStats} ${fileStats.size} --> CATALOGGING`);

    const link = `${filename.replace(APP_DATA_ROOT, CDN_ROOT)}`;

    const reactoryFileModel = new ReactoryFileModel({
        id: new ObjectID(),
        filename: path.basename(filename),
        mimetype,
        alias,
        partner: new ObjectID(global.partner.id),
        owner: new ObjectID(global.user.id),
        uploadedBy: new ObjectID(global.user.id),
        size: fileStats.size,
        hash: Hash(link),
        link: link,
        path: alias.replace(APP_DATA_ROOT, '').replace(path.basename(alias), ''),
        uploadContext: context,
        public: false,
        published: false,
    });    

    return reactoryFileModel;
}


const downloadAndCatalog = async (args: { url: string, options: RequestInit, fileOptions: any }): Promise<Reactory.IReactoryFileModel> => {

    const { url, options, fileOptions } = args;
    const id = new ObjectID();
    const randomName = `${id}.${getExtension(url)}`;

    logger.debug(`FileService.ts downloadAndCatalog(url: ${args.url}) = start`)

    return downloadFile(url, options, `/temp/${randomName}`).then((downloadResult: IFileDownloadResult) => {
        logger.debug(`File download result 🟢`, { downloadResult });
        
        return catalogFile(downloadResult.savedAs,  downloadResult.mimetype || '', downloadResult.savedAs, '').then((fileModel: Reactory.IReactoryFileModel) => {                        

            fileModel.filename = downloadResult.original;
            fileModel.alias = downloadResult.savedAs;
            fileModel.link = `${downloadResult.savedAs}`.replace(APP_DATA_ROOT, CDN_ROOT);
            fileModel.created = new Date(); 
            fileModel.ttl = fileModel.ttl || -1;

            logger.debug(`downloadAndCatalog(url: ${args.url}) = end`, fileModel);

            return fileModel.save()
        });
    });
};

export class ReactoryFileService implements Reactory.Service.IReactoryFileService {

    name: string = 'FileService';
    nameSpace: string = 'core';
    version: string = '1.0.0';

    executionContext: Reactory.ReactoryExecutionContext;

    constructor(props: any, context: any) {
        this.executionContext = {
            partner: props.partner || context.partner || global.partner,
            user: props.user || context.partner || global.user
        }
    }
    getContentBytes(path: string): number {                
        throw new Error('Method not implemented.');
    }
    getContentBytesAsString(path: string, encoding: BufferEncoding): string {                
        let contentString: string = null;

        if (fs.existsSync(path)) {
            contentString = fs.readFileSync(path, { encoding: 'utf-8' });
            const buff = Buffer.from(contentString);
            return buff.toString(encoding || 'base64');
        } else {
            throw new ApiError(`File ${path} does not exists`);
        }

    }
    async removeFilesForContext(context: string): Promise<Reactory.IReactoryFileModel[]> {
        let fordeletion: Reactory.IReactoryFileModel[] = await this.getFileModelsForContext(context).then(); 

        if (fordeletion.length > 0) {
            const removedResult = await ReactoryFileModel.deleteMany({ uploadContext: context }).then()
            if (removedResult.deletedCount === fordeletion.length) {
                return fordeletion;        
            } else {
                throw new ApiError(`Files for removal (${fordeletion.length}) and removed file count (${removedResult.deletedCount}) mismatch.`)
            }        
        }

        
        
    }
    async getFileModelsForContext(context: string): Promise<Reactory.IReactoryFileModel[]> {
        return ReactoryFileModel.find({ uploadContext: context })
    }

    async getRemote(url: string, method: string = 'GET', headers: HeadersInit | any = {}, save: boolean, options?: { ttl?: number; sync?: boolean; owner?: ObjectId; permissions?: Reactory.IReactoryFilePermissions; public: boolean; }): Promise<Reactory.IReactoryFileModel> {

        try {

            logger.debug(`🚨 Fetching Remote File. ${url}`)

            const reactoryFile: Reactory.IReactoryFileModel = await downloadAndCatalog({
                url,
                options: {
                    method,
                    headers
                },
                fileOptions: {
                    
                }
            }).then();

            reactoryFile.uploadedBy = global.user._id;
            reactoryFile.tags = ['downloaded'];

            await reactoryFile.save().then();;

            logger.debug(`🟢 Remote file ${url} downloaded and saved => ${reactoryFile.filename}`)

            return reactoryFile;

        } catch (downloadAndCatalogError) {
            logger.error(`🔴 An error occured while downloading and cataloging remote file: ${downloadAndCatalogError}`, downloadAndCatalogError);

            throw new ApiError(`An error occured while downloading and cataloging remote file ${url}`, downloadAndCatalogError);
        }

    }
    setFileModel(file: ReactoryFileModel): Promise<ReactoryFileModel> {
        throw new Error('Method not implemented.');
    }
    getFileModel(id: string): Promise<ReactoryFileModel> {
        throw new Error('Method not implemented.');
    }
    sync(): Promise<ReactoryFileModel[]> {
        throw new Error('Method not implemented.');
    }
    clean(): Promise<ReactoryFileModel[]> {
        throw new Error('Method not implemented.');
    }
    onStartup(): Promise<any> {
        logger.debug(`File Service ${this.nameSpace}.${this.name}@${this.version} 🟢`);
        return Promise.resolve(true);
    }
    getExecutionContext(): Reactory.ReactoryExecutionContext {
        return this.executionContext;
    }
    setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
        this.executionContext = executionContext;
        return true;
    }
}

export const ReactoryFileServiceDefinition: Reactory.IReactoryServiceDefinition = {
    id: 'core.ReactoryFileService@1.0.0',
    name: 'Reactory File Service',
    description: 'Default File Service for downloading and managing ReactoryFile cache and temporary files.',
    dependencies: [],
    serviceType: 'file',
    service: (props: Reactory.IReactoryServiceProps, context: any) => {
        return new ReactoryFileService(props, context);
    }
}

export default ReactoryFileServiceDefinition