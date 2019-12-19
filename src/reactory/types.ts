
export interface GeneratorProperties {
  database: string
}

export interface GeneratorConfig {
    id: string,
    connectionId: string,
    schemas?: string[],
    props: any,
}

export interface IReactoryFormsGeneratorConfig {
  enabled: boolean,  
  generators: GeneratorConfig[]
}

export interface GeneratorColumnDefinition {
  name: string,
  position: number,
  defaultValue: any
  isNullable: boolean
  dataType: string
  maxLength?: number
  numericPrecision?: number,
  numericScale: number,
  keyType: string,
  metaData?: any,
  isFK?: boolean,
  foreignTable?: string,
  foreignColumn?: string,
  foreignSchema?: string,
  foreignConnectionId?: string,
}

export interface GeneratorTableDefinition {
  tableName: string,
  schemaName?: string,
  owner?: string 
  columns?: GeneratorColumnDefinition[]
}


export interface GeneratorDatabaseDefinition {
 name: string, 
 tables: GeneratorTableDefinition[],
 connectionId: string,
 meta?: string 
}

