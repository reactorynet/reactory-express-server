"use strict";

/**
 * Several helper function available here for constructing
 * a schema document programmatically.
 */


/**
 * factory shortcut method to create string property on for an
 * object schema definition
 * @param title 
 * @param description 
 * @param minLength 
 * @param maxLength 
 * @returns 
 */
export const StringProperty = (
  title: string, description: string,
  minLength: number = undefined, maxLength: number = undefined,
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
  title: string = undefined,
  description: string = undefined,
  properties: any = DefaultObjectProperties,
) => ({
  type: 'object',
  title,
  description,
  properties,
});

export const DateProperty = (
  title: string = undefined,
  description: string = undefined,
) => ({
  type: 'string',
  format: 'date',
  title,
  description,
});

export const DateTimeProperty = (
  title: string = undefined,
  description: string = undefined,
) => ({
  type: 'string',
  format: 'date-time',
  title,
  description,
});

export const defaultFormProps: any = {
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  uiSchema: {},
};

const PropertyFactory = {
  defaultFormProps,
  StringProperty,
  ObjectProperty,
  DateProperty,
  DateTimeProperty
};


/**
 * TBC completed.  This helper function will allow 
 * you to express a schema as a series of function calls.
 * 
 * i.e. 
 * const schema = new builder({ type: 'object', title: 'User' })
 *    .definitions('Person')      
 *      .strprop('name', 5, 255)
 *      .strprop('surname', 0, 255)
 *      .date('dob')
 *      .schema() // compiles the schema for 'Person'
 *    .obj('user', 'Person') // adds an object type based on Person.
 *      .number('dependents')
 *      .array('family', 'Person')
 *        .strprop: 'relation'
 *        .schema() // compiles the 'family' item schema        
 *      .required(['name', 'dob']) 
 *      .schema() // compiles the user schema
 *    .schema() //compiles the schema 
 * 
 * must yield  an object with structure
 * 
 * {
 *   type: "object", 
 *   title: "User",
 *   definitions: {
 *    Person: {
 *      // Person definition  
 *    }
 *   },
 *   required: [['name', 'dob']]
 *   properties: {
 *    "name": { type: 'string', minLength: 0, maxLength: 255 },
 *    "surname": { type: 'string', minLength: 0, maxLength: 255 },
 *    "dob": { type: 'string', format: 'date'},
 *    "dependents": { type: 'number' },
 *    "family": {
 *       type: 'array',
 *       items: {
 *        type: 'object',
 *        ref: '$/definitions/Person',
 *        properties: {
 *          relation: { type: 'string', title: 'Relation' }
 *        }
 *       }
 *     }
 *   }
 *   
 * }
 *  
 * @param initial 
 * @returns 
 */
export const builder = (initial: any = {}) => {

  const schema = { ...initial };

  return schema;
}

export default PropertyFactory;
