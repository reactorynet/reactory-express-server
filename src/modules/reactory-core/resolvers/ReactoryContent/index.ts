
export { default as default } from './ReactoryContentResolver';
// import lodash from 'lodash';
// import { ObjectId } from 'mongodb';
// import om from 'object-mapper';
// import fs, { existsSync, mkdirSync, writeFileSync, MakeDirectoryOptions } from 'fs';
// import svg_to_png from 'svg-to-png';
// import path from 'path';
// import { Content } from '../../../../models/index';
// // import ApiError, { RecordNotFoundError } from '../../../exceptions';
// import logger from '../../../../logging';
// import Reactory from '@reactory/reactory-core'


// const {
//   APP_DATA_ROOT,
//   CDN_ROOT
// } = process.env


// interface ReactorySaveImageDataResponse {
//   success: boolean
//   pngURL: string
//   svgURL: string
// }

// export default {
//   ReactoryContent: {
//     id: (content: Reactory.IReactoryContentDocument) => {
//       return content._id.toString();
//     },
//     title: (content: Reactory.IReactoryContentDocument) => {
//       return content.title === null || content.title === undefined ? content.slug : content.title;
//     },
//   },
//   Query: {
//     ReactoryGetContentBySlug: async (parent, params) => {
//       const { slug } = params;
//       logger.debug(`Fetching Content For ${slug}`, parent);
//       const result = await Content.findOne({ slug }).then();
//       logger.debug(`Fetching Content Result: ${result}`);
//       if (lodash.isArray(result) === true && result.length === 1) {
//         return result[0];
//       }

//       return result;
//     },
//     ReactoryGetContentList: async (parent, params) => {
//       logger.debug(`Fetching All Content`, parent);

//       const result = await Content.find({}).then();

//       logger.debug(`Fetching Content Result: ${result}`);

//       return result;
//     },
//     ReactoryGetContentByTags(parent, tags) {
//       logger.debug('Getting Reactory Content By Tags', tags);
//       return [];
//     },
//     ReactoryGetContentById(parent, id) {
//       logger.debug('Getting Reactory Content By Id', id);
//       return [];
//     },
//   },
//   Mutation: {
//     ReactoryCreateContent: async (parent, args, context) => {
//       const { createInput } = args;
//       try {
//         logger.debug('Reactory Create Content Starting: ', args);
//         return await Content.findOneAndUpdate({ slug: args.createInput.slug }, {
//           ...createInput,
//           createdAt: new Date().valueOf(),
//           updatedAt: new Date().valueOf(),
//           createdBy: context.user._id,
//           updatedBy: context.user._id
//         }, { upsert: true }).then();
//       } catch (error) {
//         logger.debug('Reactory Create Content Error: ', error);
//       }
//     },
//     ReactorySaveImageData: async (parent: any, args: { folder: string, filename: string, png: string, svg: string, width: number, height: number }): Promise<ReactorySaveImageDataResponse> => {
//       const { folder, filename, png, svg, height = 2000, width = 2000 } = args;

//       const result: ReactorySaveImageDataResponse = {
//         pngURL: null,
//         svgURL: null,
//         success: false
//       }

//       // 
//       try {
//         //step check the folder        
//         if (folder) {
//           let fullpath = path.join(APP_DATA_ROOT, folder);
//           let cdnpath = path.join(CDN_ROOT, folder);
//           if (existsSync(fullpath) === false) mkdirSync(fullpath, { recursive: true });
//           if (svg) {
//             let svgfile = path.join(fullpath, `${filename}.svg`);
//             writeFileSync(svgfile, svg);
//             logger.info(`✅Saved svg to ${svgfile}`)
//             result.svgURL = path.join(cdnpath, `${filename}.svg`);
//             let pngfile = path.join(fullpath, `${filename}.png`);
//             result.success = true;

//             try {
//               await svg_to_png.convert(svgfile, pngfile, { defaultWidth: `${width}px`, defaultHeight: `${height}px` });
//               logger.info(`✅Converted svg to ${pngfile}`)
//               result.pngURL = path.join(cdnpath, `${filename}.png`);

//             } catch (convertErr) {
//               logger.error(`💥Could not convert ${svgfile} to ${pngfile}`, convertErr)
//             }
//           }
//         }
//       } catch (error) {
//         logger.error(`Could not save the image data`, error)
//       }

//       return result;
//     }
//   }
// };
