

const StringProperty = (
  title, description,
  minLength = undefined,
  maxLength = undefined,
  target = {},
  propertyName = null,
) => {

  if (target) {
    if (!target.properties) target.properties = {};
    target.properties[propertyName] = {
      type: 'string',
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
  title = undefined,
  description = undefined,
  properties = DefaultObjectProperties,
  target = {},
  propertyName = null,
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
  title = undefined,
  description = undefined,
  min = undefined,
  max = undefined,
  target = {},
  propertyName = null,
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
  title = undefined,
  description = undefined,
  target = {},
  propertyName = null,
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

export const NumberProperty = (
  title = undefined,
  description = undefined,
  min,
  max,
  target = {},
  propertyName = null,
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
  };
};



export const defaultFormProps = {
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  uiSchema: {},
};

class Builder {
  constructor(props = { type: 'string', title: 'root', description, parent: null }) {
    this._schema = {
      type: props.type,
      title: props.title
    };

    this._uiSchema = {
    };

    if (props.type === 'object') {
      this._schema.properties = {};
    }

    this._parent = props.parent;
  }

  $string(propertyName, title, description, minLength, maxLength) {
    StringProperty(title, description, minLength, maxLength, this._schema, propertyName);
    return this;
  }

  $date(propertyName, title, schemaProps = { description: '' }, uiSchema = {}) {
    DateProperty(title, schemaProps.description, undefined, undefined, this._schema, propertyName);
    return this;
  }

  $number(propertyName, title, schemaProps = { description: '' }, uiSchema = {}) {
    NumberProperty(title, schemaProps.description, undefined, undefined, this._schema, propertyName);
    return this;
  };

  $object(propertyName, title, schemaProps = { description: '', uiSchema }) {
    const objectProperty = ObjectProperty(title, schemaProps.description, {}, null, null);
    this._schema.properties[propertyName] = new Builder({ type: "object", parent: this });
    return this._schema.properties[propertyName]
  }

  $return() {
    if (this._parent) return this._parent.return();

    return this;
  }


  getSchema() {
    let el = this;

    while (el && el._parent) {
      el = el._parent;
    };

    return el._schema;
  }

  getuiSchema() {
    return this._uiSchema;
  }

  toJsonString() {
    return JSON.stringify(this._schema);
  }
}

/*
const simpleBuilder = new Builder({ type: 'object', title: 'Simple Schema' });
const _json = simpleBuilder
  .$date("when", "When")
  .$string("who", "Who", "Who did it")
  .$number("count", "How many", "How many happened")
  .$object("widgets", "Widgets", { description: "All my widget datas" })
    .$string("user", "The user")
    .$return()
  
  .getSchema()

logger.debug('simplebuilder result', _json);
*/
export default Builder;

