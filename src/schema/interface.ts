export interface ISchema {
  type: string,
  title?: string | undefined,
  description?: string | undefined,
  default?: any | undefined
}

export interface IObjectSchema extends ISchema {  
  properties?: any | undefined, 
};

export interface IArraySchema extends ISchema {  
  items: IObjectSchema | IArraySchema
};
