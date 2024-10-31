export enum UIFrameWork {
  material = 'material',
  bootstrap = 'bootstrap',
  office = 'office',
  blueprint = 'blueprint'
}

export enum TemplateType { 
  email = 'email', 
  widget = 'widget', 
  page ='page', 
  css = 'css', 
  layout = 'layout', 
  content = 'content', 
  pdf = 'pdf' 
}

//@ts-ignore
export const ENVIRONMENT: Reactory.Server.ReactoryEnvironment = {
  ...process.env,
  API_PORT: parseInt(process.env.API_PORT || '4000', 10),  
}