

import Reactory from "@reactory/reactory-core";

/**
A decorator function that sets the fully qualified name(FQN) metadata for a class or property.
@param { string } fqn The fully qualified name to be set as metadata.
@returns { (target: object, propertyKey?: string | symbol) => void} The decorator function that sets the FQN metadata.
**/
export function fqn(fqn: string): (target: any, key?: string) => void {
  return (target: any, key?: string) => {
    if (key) {
      // Set fqn metadata for a property
      Reflect.defineMetadata('fqn', fqn, target, key);
    } else {
      // Set fqn metadata for a class
      Reflect.defineMetadata('fqn', fqn, target);
    }
  };
}

/**
 * A decorator function that flags the property as an id field.
 * 
 * @param {boolean} unique - Indicates whether the id is unique.
 * 
 * @example
 * class MyClass {
 *   @id(true)
 *   id: number;
 * }
 */
export function id(unique: boolean): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('id', unique, target, propertyKey);
  } as PropertyDecorator
}

/**
 * A decorator function that sets the minimum value allowed for a number property.
 * 
 * @param {number} minValue - The minimum value allowed.
 * 
 * @example
 * class MyClass {
 *   @min(10)
 *   myNumber: number;
 * }
 */
export function min(minValue: number | string | Date): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('min', minValue, target, propertyKey);
  } as PropertyDecorator
}

/**
 * A decorator function that sets the maximum value allowed for a number property.
 * 
 * @param {number} maxValue - The maximum value allowed.
 * 
 * @example
 * class MyClass {
 *   @max(100)
 *   myNumber: number;
 * }
 */
export function max(maxValue: number | string | Date): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('max', maxValue, target, propertyKey);
  } as PropertyDecorator
}

/**
 * A decorator function that sets a translation key for a property's title.
 * 
 * @param {string} translationKey - The translation key for the property's title.
 * 
 * @example
 * class MyClass {
 *   @title('myPropertyTitle')
 *   myProperty: string;
 * }
 */
export function title(translationKey: string): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('title', translationKey, target, propertyKey);
  } as PropertyDecorator
}

/**
 * A decorator function that sets the format for a property's value.
 * 
 * @param {string} format - The format for the property's value.
 * 
 * @example
 * class MyClass {
 *   @format('email')
 *   myEmail: string;
 * }
 */
export function format(format: string): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('format', format, target, propertyKey);
  } as PropertyDecorator
}


/**
 * Defines a default value for a property.
 *
 * @param value - The default value for the property.
 * @returns A decorator function.
 *
 * @example
 *
 * class MyClass {
 *   @defaultValue(42)
 *   myProp: number;
 * }
 *
 * const myObj = new MyClass();
 * console.log(myObj.myProp); // Output: 42
 */
export function defaultValue(defaultVal: any): PropertyDecorator {
  return function (target: any, key: string) {
    let value = defaultVal;
    Object.defineProperty(target, key, {
      get: function () {
        return value;
      },
      set: function (newValue) {
        value = newValue !== undefined ? newValue : defaultVal;
      },
      enumerable: true,
      configurable: true,
    });
  } as PropertyDecorator;
}

/**
 * A decorator function that sets a property to be nullable.
 * 
 * @example
 * class MyClass {
 *   @nullable()
 *   myNullableProperty: string | null;
 * }
 */
export function nullable(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    Reflect.defineMetadata('design:nullable', true, target, propertyKey);
  }
}

/**
 * A decorator function that sets a pattern or regular expression for a string property.
 * 
 * @param {string | RegExp} pattern - The pattern or regular expression for the string property.
 * 
 * @example
 * class MyClass {
 *   @pattern(/^[A-Za-z]+$/)
 *   myAlphaString: string;
 * }
 */
export function pattern(pattern: string | RegExp): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('pattern', pattern, target, propertyKey);
  } as PropertyDecorator
}

/**
 * A decorator function that sets whether a property on a class 
 * is required or not.
 * 
 * @example
 * class MyClass {
 *    @required
 *    requiredFieldName: string;
 * }
 */
export function required() {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('required', true, target, propertyKey);
  }
}

/**
 * A function that creates an instance of a class.
 * 
 * @param {new (props?: any) => T} type - The type of the class.
 * 
 * @example
 * class MyClass {
 *   myProperty: string;
 * }
 * const myInstance = createInstance(MyClass);
 */
export function createInstance<T>(type: new (props?: any) => T, props?: any): T {
  return new type(props);
}

// /**
//  * Checks if a classname is in a namespace, this will only work for namespaces
//  * that are exposed to the global namespace
//  * @param cls 
//  * @param namespace 
//  * @returns 
//  */
// export function isClassInNamespace(cls: Function, namespace: string): boolean {
//   // const namespaceRegex = new RegExp(`^${namespace}\\.`);
//   // const className = cls.prototype.constructor.name;
//   // return namespaceRegex.test(className);
//   //@ts-ignore
//   if(global[namespace][cls.prototype.name]) return true;
//   else return false;
// }


/**
Returns a Reactory schema for the given type.
@template T
@param { {new(): T} } type - The type to generate the schema for.
@returns {Reactory.Schema.AnySchema} - The schema for the given type.
*/
export function getTypeSchema<T>(type: { new(): T }): Reactory.Schema.AnySchema {
  //@ts-ignore
  const schema: Reactory.Schema.ISchema = {};
  (schema as Reactory.Schema.ISchema).$type = `${(type as any)?.constructor?.name}`;
  if (typeof type === "string" ||
    typeof type === "number" ||
    typeof type === "boolean" ||
    type === null || (typeof type === "object" && schema.$type === "Date")) {
    if (schema.$type === "Date") {
      schema.type = "string";
      schema.format = "date-time";
    } else schema.type = typeof type;
  } else if (Array.isArray(type)) {
    //schema.type = Reflect.getMetadata('design:nullable', type) ? ["array", "null"] : "array";
    schema.type = "array"
    schema.items = getTypeSchema(type);
  } else if (typeof type === "object" && type !== null) {
    // schema.type = Reflect.getMetadata('design:nullable', type) ? ["object", "null"] : "object";
    schema.type = "object"
    schema.properties = {};

    for (const key in type as any) {
      //@ts-ignore
      if (type.hasOwnProperty(key)) {
        //@ts-ignore
        const propertySchema = getTypeSchema(type[key]);
        const titleKey = Reflect.getMetadata('title', type, key);
        if (titleKey) {
          propertySchema.title = titleKey;
        }
        //@ts-ignore
        if (type[key]?.constructor === Number) {
          const min = Reflect.getMetadata('min', type, key);
          const max = Reflect.getMetadata('max', type, key);
          if (min) {
            (propertySchema as Reactory.Schema.INumberSchema).minimum = min;
          }
          if (max) {
            (propertySchema as Reactory.Schema.INumberSchema).maximum = max;
          }
          //@ts-ignore
        } else if (type[key]?.constructor === Date) {
          const min = Reflect.getMetadata('min', type, key);
          const max = Reflect.getMetadata('max', type, key);
          if (min) {
            (propertySchema as Reactory.Schema.INumberSchema).minimum = min;
          }
          if (max) {
            (propertySchema as Reactory.Schema.INumberSchema).maximum = max;
          }

          propertySchema.type = "string";
          propertySchema.format = Reflect.getMetadata('format', type, key) || "date-time";
          //@ts-ignore
        } else if (type[key]?.constructor === String) {
          const min = Reflect.getMetadata('min', type, key);
          const max = Reflect.getMetadata('max', type, key);
          const pattern = Reflect.getMetadata('pattern', type, key);
          if (min) {
            (propertySchema as Reactory.Schema.IStringSchema).minLength = min;
          }
          if (max) {
            (propertySchema as Reactory.Schema.IStringSchema).maxLength = max;
          }

          if (pattern) {
            (propertySchema as Reactory.Schema.IStringSchema).pattern = pattern;
          }

          propertySchema.type = "string";
        }
        //@ts-ignore
        // propertySchema.type = Reflect.getMetadata('design:nullable', type, key) === true ? [propertySchema.type, "null"] : propertySchema.type;
        schema.properties[key] = propertySchema;
      }
    }

    //@ts-ignore
    const required = Object.keys(type).filter(key => type[key]?.required === true);
    if (required.length) {
      schema.required = required;
    }
  }
  return schema;
}

export function getUISchema<T>(type: { new(): T }): Reactory.Schema.IFormUISchema {
  return {};
}

