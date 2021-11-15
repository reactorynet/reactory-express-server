
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
import { template } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators';
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

const catalogFile = async (filename: string, mimetype: string, alias: string, context: string = 'downloaded', partner: Reactory.IReactoryClientDocument, owner: Reactory.IUserDocument): Promise<Reactory.IReactoryFileModel> => {
    // Check if image is valid
    const fileStats: fs.Stats = fs.statSync(filename);
    logger.debug(`SAVING FILE:: DONE ${fileStats} ${fileStats.size} --> CATALOGGING`);

    const link = `${filename.replace(APP_DATA_ROOT, CDN_ROOT)}`;

    const reactoryFileModel = new ReactoryFileModel({
        id: new ObjectID(),
        filename: path.basename(filename),
        mimetype,
        alias,
        partner: partner._id,
        owner: owner._id,
        uploadedBy: owner._id,
        size: fileStats.size,
        hash: Hash(link),
        link: link,
        path: alias.replace(APP_DATA_ROOT, '').replace(path.basename(alias), ''),
        uploadContext: context,
        public: false,
        deleted: false,
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

        return catalogFile(downloadResult.savedAs, downloadResult.mimetype || '', downloadResult.savedAs, '').then((fileModel: Reactory.IReactoryFileModel) => {

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

    context: Reactory.IReactoryContext;

    constructor(props: any, context: Reactory.IReactoryContext) {
        this.context = context
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

    async getRemote(url: string,
        method: string = 'GET',
        headers: HeadersInit | any = {},
        save: boolean,
        options?: { ttl?: number; sync?: boolean; owner?: ObjectId; permissions?: Reactory.IReactoryFilePermissions; public: boolean; }): Promise<Reactory.IReactoryFileModel> {

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

            reactoryFile.uploadedBy = this.context.user._id;
            reactoryFile.tags = ['downloaded'];

            await reactoryFile.save().then();;

            logger.debug(`🟢 Remote file ${url} downloaded and saved => ${reactoryFile.filename}`)

            return reactoryFile;

        } catch (downloadAndCatalogError) {
            logger.error(`🔴 An error occured while downloading and cataloging remote file: ${downloadAndCatalogError}`, downloadAndCatalogError);

            throw new ApiError(`An error occured while downloading and cataloging remote file ${url}`, downloadAndCatalogError);
        }

    }
    setFileModel(file: Reactory.IReactoryFileModel): Promise<Reactory.IReactoryFileModel> {
        throw new Error('Method not implemented.');
    }
    getFileModel(id: string): Promise<Reactory.IReactoryFileModel> {
        return ReactoryFileModel.findById(id).then()
    }
    sync(): Promise<Reactory.IReactoryFileModel[]> {
        throw new Error('Method not implemented.');
    }
    clean(): Promise<Reactory.IReactoryFileModel[]> {
        throw new Error('Method not implemented.');
    }
    onStartup(): Promise<any> {
        this.context.log(`File Service ${this.nameSpace}.${this.name}@${this.version} ${this.context.colors.green('STARTUP OKAY')} ✅`);
        return Promise.resolve(true);
    }
    
    getExecutionContext(): Reactory.IReactoryContext {
        return this.context;
    }

    setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
        this.context = executionContext;
        return true;
    }


    uploadFile = async (args: Reactory.Service.FileUploadArgs): Promise<Reactory.IReactoryFileModel> => {
        return new Promise(async (resolve, reject) => {


            const { uploadContext, file, isUserSpecific = false, rename = true, catalog = true } = args;
            const { createReadStream, filename, mimetype, encoding } = await file;
            const { user, partner } = this.context;

            logger.debug(`ReactoryFileServer.uploadFile() - start ⭕ ${filename} - ${mimetype} ${encoding}`);

            const stream: NodeJS.ReadStream = createReadStream();

            let extension = getExtension(filename);

            let $filename = rename === true ? `${sha1(new Date().getTime().toString())}.${extension}` : filename;

            if (args.filename) {
                if (args.filename.indexOf('.') === -1)
                    $filename = `${args.filename}.${extension}`;
                else
                    $filename = args.filename;
            }

            //set the default path/folder to the user/files/partner/            
            let virtualPath = `profiles/${user._id}/files/${partner._id}/`;


            //general path                        
            if (isUserSpecific === false) {
                //general file            
                virtualPath = 'content/files/';
            }
            // if there is a virtual path, use it.
            if (args.virtualPath) virtualPath = args.virtualPath;

            // establish physical path
            let physicalPath = path.join(process.env.APP_DATA_ROOT, virtualPath);
            // get the virtual path
            let virtualFilePath = path.join(virtualPath, $filename);
            // get the physical file and pathname
            let phyicalFilePath = path.join(physicalPath, $filename);

            let web_link = `${process.env.CDN_ROOT}${virtualFilePath}`;

            //make sure the folder structure exists before attemptying the write
            if (fs.existsSync(physicalPath) === false) {
                fs.mkdirSync(physicalPath, { recursive: true });
            }

            // Flag to tell if a stream had an error.
            let hadStreamError: boolean = null;

            //ahndles any errors during upload / processing of file
            const handleStreamError = (error: any) => {
                // Do not enter twice in here.
                logger.error(`ReactoryFileServer.uploadFile() - start ⭕ ${filename} ==> 🚨 Error in stream`, { error })
                if (hadStreamError) {
                    return;
                }

                hadStreamError = true;

                // Cleanup: delete the saved path.
                if (phyicalFilePath) {
                    // eslint-disable-next-line consistent-return
                    return fs.unlink(phyicalFilePath, () => {
                        reject(error)
                    });
                }

                // eslint-disable-next-line consistent-return
                reject(error)
            }


            const catalogFile = () => {
                // Check if image is valid
                const fileStats: fs.Stats = fs.statSync(phyicalFilePath);
                logger.debug(`ReactoryFileServer.uploadFile() - ✅ ${filename} ${fileStats.size} received ==> CATALOGGING`);

                let upload_context = uploadContext;
                if (upload_context.indexOf('${') >= 0) {
                    try {
                        upload_context = template(upload_context)({ user_id: this.context.user._id, partner_id: this.context.partner._id })
                    } catch (templateError) {
                        upload_context = `reactory::failed::context`
                    }
                }


                const reactoryFile: any = {
                    id: new ObjectID(),
                    filename,
                    mimetype,
                    alias: $filename,
                    partner: this.context.partner._id,
                    owner: this.context.user._id,
                    uploadedBy: this.context.user._id,
                    size: fileStats.size,
                    hash: Hash(web_link),
                    link: web_link,
                    path: virtualPath,
                    uploadContext: uploadContext,
                    public: false,
                    published: false,
                };

                if (args.catalog === true) {
                    const savedDocument = new ReactoryFileModel(reactoryFile);

                    savedDocument.save().then(() => {
                        logger.debug(`SAVING FILE:: DONE ${filename} --> CATALOGGING`);
                        resolve(savedDocument);
                    }).catch((err) => { reject(err) });
                } else {
                    //if we 
                    resolve(reactoryFile);
                }


            }

            // Generate path where the file will be saved.            
            // the default location.            

            logger.debug(`SAVING FILE:: ${filename} --> ${physicalPath}`);

            //@ts-ignore
            const diskWriterStream: NodeJS.WriteStream = fs.createWriteStream(phyicalFilePath);
            diskWriterStream.on('error', handleStreamError);

            // Validate image after it is successfully saved to disk.
            diskWriterStream.on('finish', catalogFile);

            // Save file to disk.
            logger.debug(`ReactoryFileServer.uploadFile() ${filename} ==> starting pipe 🚰`)
            stream.pipe(diskWriterStream);
        });
    };

    catalogFile = async (filename: string, mimetype: string, alias?: string, context?: string, partner?: Reactory.IReactoryClientDocument, owner?: Reactory.IUserDocument): Promise<Reactory.IReactoryFileModel> => {
        // Check if image is valid

        if(fs.existsSync(filename) === false) {
            return null;
        }

        const fileStats: fs.Stats = fs.statSync(filename);
        this.context.log(`catatlogFile(filenmae: ${filename}, ${mimetype}) ${fileStats} ${fileStats.size} --> CATALOGGING`);

        const link = `${filename.replace(APP_DATA_ROOT, CDN_ROOT)}`;
        const _id: ObjectId = new ObjectId();
        const reactoryFileModel = new ReactoryFileModel({
            _id,
            id: _id,
            filename: path.basename(filename),
            mimetype,
            alias: alias || path.basename(filename),
            partner: partner ? partner._id : this.context.partner._id,
            owner: owner ? owner._id : this.context.user._id,
            uploadedBy: owner ? owner._id : this.context.user._id,
            size: fileStats.size,
            hash: Hash(link),
            link: link,
            path: alias.replace(APP_DATA_ROOT, '').replace(path.basename(alias), ''),
            uploadContext: context || "system::catalog",
            public: false,
            deleted: false,
            published: false,
        });

        await reactoryFileModel.save().then();

        return reactoryFileModel;
    }

    /**
     * 
     */    
    @roles(["ADMIN", "DEVELOPER", "${arguments[0].owner._id === context.user._id}"])
    deleteFile( fileModel: Reactory.IReactoryFileModel ): boolean {
        let filepath = path.join(APP_DATA_ROOT, fileModel.path, fileModel.filename);
        if(fs.existsSync(filepath) === true)
            fs.unlinkSync(filepath);

        return fs.existsSync(filepath) === true;
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