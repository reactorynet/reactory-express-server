import { exec } from 'child_process';
import logger from "@reactory/server-core/logging";
import { Reactory } from "@reactory/server-core/types/reactory";
const {
    CDN_ROOT,
    APP_DATA_ROOT
} = process.env

export interface IReactoryMongoBackupParams {
    db_name: string
};

export interface IReactoryMongoBackupResult {
    message: string
    success: boolean
    url: string
    file: string
    log: string[]
};



const ReactoryMongo = {
    Query: {

    },
    Mutation: {
        ReactoryMongoBackup: async (params: IReactoryMongoBackupParams, context: Reactory.IReactoryContext): Promise<IReactoryMongoBackupResult> => {

            const $user: Reactory.IUserDocument = context.user;

            const backup = (database: string = 'reactory'): Promise<IReactoryMongoBackupResult> => {

                logger.debug(`[REACTORY-DEVOPS] 🟠 Starting Backup - ${database} | USER: ${$user.fullName(true)}`);

                const result: IReactoryMongoBackupResult = {
                    message: '',
                    success: true,
                    log: [],
                    file: '',
                    url: `${CDN_ROOT}database/backup/production/`
                };

                return new Promise((resolve, reject) => {
                    try {
                        exec(`bin/backup.sh ${database}}`, (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
                            if (error) {
                                result.message = `Backup Error: ${error.message}`;
                                result.success = false;
                                result.log.push(`Error occurred running backup`);

                                logger.error(`[REACTORY-DEVOPS] 🟥 Backup ${database} Failed | USER: ${$user.fullName(true)}`);
                                logger.error(`[REACTORY-DEVOPS] - ${error.message}`);

                                reject(result);
                            } else {

                                let output = '';
                                if (stdout instanceof Buffer) {
                                    result.log = stdout.toString('utf8').split('\n');
                                }

                                if (typeof stdout === 'string') {
                                    result.log = (stdout as string).split('\n');
                                }

                                result.file = result.log[0];
                                result.url = `${result.file}`.replace('file://', `${CDN_ROOT.indexOf('https') === 0 ? "https://" : "http://"}`)
                                result.url = result.url.replace(APP_DATA_ROOT, CDN_ROOT.substring(CDN_ROOT.indexOf("://"), CDN_ROOT.length - CDN_ROOT.indexOf("://")))

                                logger.error(`[REACTORY-DEVOPS] 🟢 Backup ${database} Complete | USER: ${$user.fullName(true)}`);

                                resolve(result);
                            }
                        });
                    } catch (childProcessError) {
                        result.message = childProcessError.message
                        reject(result);
                    }
                });

            }

            return backup(params.db_name);
        }
    }
};

export default ReactoryMongo;