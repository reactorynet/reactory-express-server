import { Reactory } from "@reactory/server-core/types/reactory";
import { createWriteStream, readFile, readFileSync } from "fs";
import ExcelJS from 'exceljs';
import moment from "moment";

let DefaultExcelWriterOptions: Reactory.Service.IExcelWriterOptions;
const {
  CDN_ROOT,
  API_DATA_ROOT
} = process.env;


export const getWorkbook = async (user: Reactory.IUser, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<ExcelJS.Workbook> => {

  let workbook = new ExcelJS.Workbook();
  const modfiedBy = `${(user as Reactory.IUser).fullName(true)}`;
  const now = moment();

  workbook.creator = modfiedBy;
  workbook.lastModifiedBy = modfiedBy;
  workbook.created = now.toDate();
  workbook.modified = now.toDate();
  workbook.lastPrinted = now.toDate();
  // write to a file  
  if (appender) workbook = await appender(workbook);

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

const DefaultFont = { name: 'Calibri', family: 1, size: 11 };


class ReactoryExcelWriterService implements Reactory.Service.IExcelWriterService {

  name = 'ExcelService';
  nameSpace = 'core';
  version = '1.0.0';

  context: Reactory.IReactoryContext = null;

  constructor(props: any, context: Reactory.IReactoryContext) {
    this.context = context;
  }

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setCellRichText(cell: ExcelJS.Cell, cellProps: any): ExcelJS.Cell {

    const { font = DefaultFont, value } = cellProps

    cell.value = {
      'richText': [
        { 'font': font || {}, 'text': value },
      ]
    };

    if (cell.font) cell.font = font

    return cell;
  };

  async writeAsStream(options: Reactory.Service.IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<Boolean> {

    const workbook = await getWorkbook(this.context.user, appender);
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

  async writeAsFile(options: Reactory.Service.IExcelWriterOptions, appender: (workbook: ExcelJS.Workbook) => Promise<ExcelJS.Workbook>): Promise<boolean> {
    const workbook = await getWorkbook(this.context.user, appender).then();

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
    return new ReactoryExcelWriterService(props, context);
  }
}

export default ReactoryExcelWriterService;