import { Reactory } from "@reactory/server-core/types/reactory";
import { createWriteStream, readFile, readFileSync } from "fs";
import ExcelJS from 'exceljs';
import moment from "moment";

let DefaultExcelWriterOptions: Reactory.Service.IExcelWriterOptions;
const {
  CDN_ROOT,
  API_DATA_ROOT
} = process.env;
 

export const getWorkbook = async (user: Reactory.IUser, appender: (workbook: ExcelJS.Workbook)=> Promise<ExcelJS.Workbook> ): Promise<ExcelJS.Workbook> => {

  let workbook = new ExcelJS.Workbook();
  const modfiedBy = `${(user as Reactory.IUser).fullName(true)}`;
  const now = moment();

  workbook.creator = modfiedBy;
  workbook.lastModifiedBy = modfiedBy;
  workbook.created = now.toDate();
  workbook.modified = now.toDate();
  workbook.lastPrinted = now.toDate();  
  // write to a file  
  if(appender) workbook = await appender(workbook);

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

class ReactoryExcelWriterService implements Reactory.Service.IExcelWriterService {

  name = 'ExcelService';
  nameSpace = 'core';
  version = '1.0.0';

  executionContext: Reactory.ReactoryExecutionContext = null;

  constructor(){
    this.setExecutionContext({ 
      partner: global.partner,
      user: global.user
    });
  }

  getExecutionContext(): Reactory.ReactoryExecutionContext {
    return this.executionContext
  }
  setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
    this.executionContext = executionContext;
    return true;
  }

  async writeAsStream(options: Reactory.Service.IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Boolean> {

    const workbook = await getWorkbook(this.getExecutionContext().user, appender);    
    // write to a stream
    await workbook.xlsx.write(options.stream).then();
    
    // write to a new buffer 
    return true;  
  }

  async writeToBuffer(options: Reactory.Service.IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Buffer> {

    const workbook = await getWorkbook(this.getExecutionContext().user, appender);

    const buffer: Buffer = await workbook.xlsx.writeBuffer().then();

    return buffer;
  }
  
  async writeAsFile(options: Reactory.Service.IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook)=> Promise<ExcelJS.Workbook>): Promise<boolean> {
    const workbook = await getWorkbook(global.user, appender).then();
    
    await workbook.xlsx.writeFile(options.filename).then();

    return true;    
  };
  
};

export const ReactoryExcelWriterServiceDefinition: Reactory.IReactoryServiceDefinition = {
  id: 'core.ReactoryExcelWriterService@1.0.0',
  name: 'Reactory Excel Writer Service',
  description: 'Default service for processing.',
  dependencies: [],
  serviceType: 'file',
  service: (props: any, context: any) => {
      return new ReactoryExcelWriterService();
  }
}

export default ReactoryExcelWriterService;