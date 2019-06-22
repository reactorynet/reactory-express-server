

export const StringProperty = (
  title, description,
  minLength = undefined, maxLength = undefined,
) => {
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
) => ({
  type: 'object',
  title,
  description,
  properties,
});

export const DateProperty = (
  title = undefined,
  description = undefined,
) => ({
  type: 'string',
  format: 'date',
  title,
  description,
});

export const DateTimeProperty = (
  title = undefined,
  description = undefined,
) => ({
  type: 'string',
  format: 'date-time',
  title,
  description,
});

export const defaultFormProps = {
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  uiSchema: {},
};

const PropertyFactory = {
  defaultFormProps,
  StringProperty,
  ObjectProperty,
};

export default PropertyFactory;
