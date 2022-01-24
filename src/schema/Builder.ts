
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';

const StringProperty = (
  title: string,
  description: string,
  minLength: number = null,
  maxLength: number = null,
  target: Reactory.ISchema = null,
  propertyName: string = null,
): Reactory.IStringSchema => {

  if (target) {
    if (!target.properties) target.properties = {};
    target.properties[propertyName] = {
      type: "string",
      title,
      description,
      minLength,
      maxLength,
    };

    return target;
  }


  return {
    type: 'string',
    title,
    description,
    minLength,
    maxLength,
  };
};

const DefaultObjectProperties = {
  id: StringProperty('Id', 'System Assigned Id', 0, 50),
};

export const ObjectProperty = (
  title: string = 'ObjectPropertyName',
  description: string = undefined,
  properties: Reactory.ISchemaObjectProperties = DefaultObjectProperties,
  target: Reactory.ISchema,
  propertyName: string = null,
) => {
  if (target) {
    if (!target.properties) target.properties = {};
    target.properties[propertyName] = {
      type: 'object',
      title,
      description,
      properties: {}
    };

    return target;
  }

  return {
    type: 'object',
    title,
    description,
    properties,
  };
};

export const DateProperty = (
  title: string = 'DateProperty',
  description: string = null,
  min: number | string | Date = undefined,
  max: number | string | Date = undefined,
  target: Reactory.ISchema = null,
  propertyName: string = null,
) => {

  if (target) {
    if (!target.properties) target.properties = {}

    target.properties[propertyName] = {
      type: 'string',
      format: 'date',
      title,
      description,
      min,
      max,
    };

    return target;
  }

  return {
    type: 'string',
    format: 'date',
    title,
    description,
  };

};

export const DateTimeProperty = (
  title: string = 'Date Time Property',
  description: string = undefined,
  min: number | string | Date = undefined,
  max: number | string | Date = undefined,
  target: Reactory.ISchema,
  propertyName: string = null,
) => {

  if (target) {
    if (!target.properties) target.properties = {}

    target.properties[propertyName] = {
      type: 'string',
      format: 'date',
      title,
      description,
      min,
      max,
    };

    return target;
  }

  return {
    type: 'string',
    format: 'date',
    title,
    description,
    min,
    max,
  };
};

export const NumberProperty = (
  title: string = 'Number Property',
  description: string = null,
  min: number | "null" = undefined,
  max: number | "null" = undefined,
  target: Reactory.ISchema = undefined,
  propertyName: string = null,
) => {

  if (target) {
    if (!target.properties) target.properties = {}

    target.properties[propertyName] = {
      type: 'number',
      title,
      description,
      min,
      max,
    };

    return target;
  }

  return {
    type: 'number',
    title,
    description,
    min,
    max
  };
};


export interface ISchemaBuilder {
  /***
   * Creates a string schema property that is added to the current builder instance.
   * Must always return the Current ISchemaBuilder instance 
   * @param name - The name for the property we adding the the schema 
   * @param title - The title for the schema element
   * @param description - The description for the string element
   * @param minLength - The minimum length we want for this string element
   * @param maxLength - The maximum length we want for this string element
   * @param defaultValue - The default Value we want to assign for this string element
   * @param uiSchema - The uiSchema (optional) we want to assign for this schema
   */
  $string(name: string,
    title: string,
    description: string,
    minLength: number,
    maxLength: number,
    uiSchema: Reactory.IUISchema): ISchemaBuilder;

  /**
   * Creates a date formated string property on the current builder instance
   * @param name - The name for the property
   * @param title - the title we want to add for the date property 
   * @param description - the description we want to add for the current builder instance
   * @param defaultValue - the default value we want to assign this date property i.e. now +-(ticks)
   * @param uiSchema - the uiSchema to be added for the default use of the this property
   */
  $date(name: string, title: string, description: string, defaultValue: string | number | Date | Function, uiSchema: Reactory.IUISchema): ISchemaBuilder;

  /**
   * Creates a number property on the current builder instance
   * @param name - The name of the property
   * @param title - The title for the property
   * @param description - The description for the property
   * @param uiSchema - The uiSchema to be added for the default use of this property
   */
  $number(name: string, title: string, description: string, minValue: number | "null", maxValue: number | "null", uiSchema: Reactory.IUISchema): ISchemaBuilder;
  /**
   * Creates a object schema property that is added to the current 
   * builder instance. If the readOnly parameter is set to true 
   * the function returns the parent builder.  If the readOnly property is set
   * to false, the function returns the ISchemaBuilder for the property
   * @param name - The name for the property as it is used on the object.
   * @param title - The title for the property
   * @param description - Description for the property
   * @param schema - Input schema / base schema  
   * @param uiSchema - The uiSchema that represents this object (optional) 
   * @param readOnly - Boolean toggles which element is returned
   * @param props - Additional properties to add to the schema i.e. helperText, title:afZA etc.
   */
  $object(name: string, title: string, description: string, schema: Reactory.IObjectSchema, uiSchema: Reactory.IUISchema, readOnly: Boolean, props: any): ISchemaBuilder;

  /**
   * 
   * @param name 
   * @param title 
   * @param description 
   * @param item 
   * @param uiSchema 
   */
  $array(name: string, title: string, description: string, item: Reactory.ISchema | Reactory.IObjectSchema, uiSchema: Reactory.IUISchema): ISchemaBuilder;

  $parent(): ISchemaBuilder | null
  /**
   * Returns the schema for the builder instance
   */
  $schema(): Reactory.ISchema

  /**
   * Returns the uiSchema for the builder instance
   */
  $uiSchema(): Reactory.IUISchema
}




export default class Builder implements ISchemaBuilder {

  _schema: Reactory.ISchema;
  _uiSchema: Reactory.IUISchema;
  _parent: ISchemaBuilder;

  constructor(name: string = 'ObjectProperty', title: string, description: string, type: string = 'object', parent: ISchemaBuilder = null, schema: Reactory.ISchema = undefined) {


    if (schema) {
      this._schema = schema;
    } else {

      this._schema = {
        type: type,
        description: description,
        title: title,
        properties: {}
      };
    }

    this._uiSchema = {
    };

    if (parent !== null) {
      this._parent = parent;
    }

    this.$string = this.$string.bind(this);
    this.$number = this.$number.bind(this);
    this.$date = this.$date.bind(this);
    this.$object = this.$object.bind(this);
    this.$array = this.$array.bind(this);
    this.$parent = this.$parent.bind(this);
    this.$uiSchema = this.$uiSchema.bind(this);
    this.$schema = this.$schema.bind(this);
  }

  $string(name: string, title: string, description: string, minLength: number = null, maxLength: number = null): ISchemaBuilder {
    StringProperty(title, description, minLength, maxLength, this._schema, name);
    return this;
  }

  $date(name: string, title: string, description: string, defaultValue: string | number | Date | Function, uiSchema: Reactory.IUISchema = null): ISchemaBuilder {
    DateProperty(title, description, undefined, undefined, this._schema, name);
    return this;
  }

  $number(name: string, title: string, description: string, minValue: number | "null" = null, maxValue: number | "null" = null, uiSchema: Reactory.IUISchema = null): ISchemaBuilder {
    NumberProperty(title, description, minValue, maxValue, this._schema, name);
    return this;
  };

  $object(name: string, title: string, description: string, schema: Reactory.IObjectSchema, uiSchema: Reactory.IUISchema = null, readOnly: Boolean = false, props: any = {}): ISchemaBuilder {
    const objectProperty = ObjectProperty(title, description, schema && schema.properties ? schema.properties : {}, null, null);

    this._schema.properties[name] = objectProperty;
    this._schema.properties[name].$builder = new Builder(name, title, description, 'object', this, this._schema.properties[name]);

    if (readOnly === false) {
      return this._schema.properties[name].$builder
    } else {
      return this;
    }
  }

  $array(name: string, title: string, description: string, item: Reactory.ISchema | Reactory.IObjectSchema, uiSchema: Reactory.IUISchema): ISchemaBuilder {
    return this;
  }

  $parent() {
    return this._parent || this;
  }

  $schema() {
    if (this._parent) return this._parent.$schema();
    else {
      return this._schema;
    }
  }

  $uiSchema() {
    if (this._parent) return this._parent.$uiSchema();
    else {
      return this.$uiSchema;
    }
  }


  toJsonstring() {
    return JSON.stringify(this._schema);
  }
}

const ReactoryObjectSchema = new Builder('Reactory', 'Reactory Builder', 'Some Descrition', 'object')
  .$string('root_string', 'Root String', '')
  .$number('root_number', 'A number field', '', 0, 12)
  .$schema();

logger.debug('Reactory Root Object Schema', ReactoryObjectSchema)