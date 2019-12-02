import { Reactory } from "@reactory/server-core/types/reactory";
import { createWriteStream, readFile, readFileSync } from "fs";
import ExcelJS from 'exceljs';
import moment from "moment";

let DefaultExcelWriterOptions: Reactory.Service.IExcelWriterOptions;
const {
  CDN_ROOT,
  API_DATA_ROOT
} = process.env;

const getWorkbook = (user: Reactory.IUserDocument) => {

  let workbook = new ExcelJS.Workbook();
  const modfiedBy = `${(user as Reactory.IUserDocument).fullName(true)}`;
  const now = moment();

  workbook.creator = modfiedBy;
  workbook.lastModifiedBy = modfiedBy;
  workbook.created = now.toDate();
  workbook.modified = now.toDate();
  workbook.lastPrinted = now.toDate();  
  // write to a file  
  return workbook;
}

DefaultExcelWriterOptions = {
  formatting: {
    font: '',
  },
  output: 'stream',
  filename: 'Reactory.Services.Default.xlsx',
  params: {

  },
  query: '',  
};

const ReactoryExcelWriterService: Reactory.Service.IExcelWriterService = {
  writeAsFile: async (options: Reactory.Service.IExcelWriterOptions) => {
    const workbook = getWorkbook(global.user);
  
    await workbook.xlsx.writeFile(options.filename).then();

    return true;    
  },
  writeAsStream: async (options: Reactory.Service.IExcelWriterOptions) => {
    const workbook = getWorkbook(global.user);    
    // write to a stream
    await workbook.xlsx.write(options.stream).then();
    
    // write to a new buffer 
    return true;  
  },
  writeToBuffer: async(options: Reactory.Service.IExcelWriterOptions) => {
    const workbook = getWorkbook(global.user);    
    const buffer: Buffer = await workbook.xlsx.writeBuffer().then();

    return buffer;
  }
};

export default ReactoryExcelWriterService;