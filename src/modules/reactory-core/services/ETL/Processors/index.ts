import UserFileImportCSV2JSON from "./UserFileImportCSV2JSON"
import UserDemographicsProcessor from './UserDemographicsProcessors';
import UserGeneralProcessor from './UserGeneralProcessor';
import UserImportFilePreview from './UserImportFilePreview';
import UserImportFileValidation from './UserImportFileValidation';
export default [
  UserFileImportCSV2JSON.reactory,
  UserDemographicsProcessor.reactory,
  UserGeneralProcessor.reactory,
  UserImportFilePreview.reactory,
  UserImportFileValidation.reactory,
]