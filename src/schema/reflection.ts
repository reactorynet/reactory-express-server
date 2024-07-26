import "reflect-metadata";
import Reactory from "@reactory/reactory-core";

export type StoreType = "rest" | "grapql" | "grpc" | Reactory.FQN;

export type IdGenerator = "objectid" | "uuid" | "snowflake" | Reactory.FQN;

/**
 * A decorator function that sets the name of the storage model to associate with this class.
 * @param fqn - The fully qualified name of the storage model / service that will be bound to this view model.
 * @returns
 */
export function store(fqn: StoreType, mapper?: Reactory.FQN): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata("store", fqn, target);
    Reflect.defineMetadata("mapper", mapper, target);
  };
}

/**
 * A decorator that sets a class / structure for a an array type
 * @param fqn
 * @returns
 */
export function type(proto: any): PropertyDecorator {
  return function (target: any, key?: string) {
    if (!key) {
      throw new Error("The itemType decorator can only be used on a property.");
    }
    Reflect.defineMetadata("itemType", proto, target, key);
  };
}

/**
 * Use the ref decorator to set a reference to another object schema.
 * @param proto
 * @returns
 */
export function ref(proto: any): PropertyDecorator {
  return function (target: any, key?: string) {
    if (!key) {
      throw new Error("The ref decorator can only be used on a property.");
    }
    Reflect.defineMetadata("ref", proto, target, key);
  };
}

/**
 * A decorator function that sets the enum properties.
 * @param enumType
 * @param values
 * @param provider
 * @returns
 */
export function enumType(
  enumType: any,
  values?: { key: string; value: any; title?: string }[],
  provider?: Reactory.FQN
): PropertyDecorator {
  return function (target: any, key?: string) {
    if (!key) {
      throw new Error("The enumType decorator can only be used on a property.");
    }

    Reflect.defineMetadata("enumType", enumType, target, key);
    if (!values && typeof enumType.getValues === "function") {
      values = enumType.getValues();
    }

    if (values) {
      Reflect.defineMetadata("enumValues", values, target, key);
    }

    if (provider) {
      Reflect.defineMetadata("enumValueProvider", provider, target, key);
    }
  };
}

/**
A decorator function that sets the fully qualified name(FQN) metadata for a class or property.
@param { string } fqn The fully qualified name to be set as metadata.
@returns { (target: object, propertyKey?: string | symbol) => void} The decorator function that sets the FQN metadata.
**/
export function fqn(fqn: string): (target: any, key?: string) => void {
  return (target: any, key?: string) => {
    if (key) {
      // Set fqn metadata for a property
      Reflect.defineMetadata("fqn", fqn, target, key);
    } else {
      // Set fqn metadata for a class
      Reflect.defineMetadata("fqn", fqn, target);
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
export function id(
  unique: boolean,
  generator: IdGenerator = "objectid"
): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("id", unique, target, propertyKey);
    if (generator)
      Reflect.defineMetadata("id-generator", generator, target, propertyKey);
  } as PropertyDecorator;
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
export function min(
  minValue: number | string | Date,
  errorString?: string
): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("min", minValue, target, propertyKey);
    Reflect.defineMetadata("errorString", errorString, target, propertyKey);
  } as PropertyDecorator;
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
export function max(
  maxValue: number | string | Date,
  errorString?: string
): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("max", maxValue, target, propertyKey);
    Reflect.defineMetadata("errorString", errorString, target, propertyKey);
  } as PropertyDecorator;
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
  return function (target: any, propertyKey?: string) {
    Reflect.defineMetadata("title", translationKey, target, propertyKey);
  } as PropertyDecorator;
}

export function formTitle(translationKey: string): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata("formTitle", translationKey, target);
  };
}

/**
 * A decorator function that sets a translation key for the property's description.
 * @param translationKey
 * @returns
 */
export function description(translationKey: string): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("description", translationKey, target, propertyKey);
  } as PropertyDecorator;
}

export function formDescription(translationKey: string): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata("formDescription", translationKey, target);
  };
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
    Reflect.defineMetadata("format", format, target, propertyKey);
  } as PropertyDecorator;
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
    Reflect.defineMetadata("design:nullable", true, target, propertyKey);
  };
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
    Reflect.defineMetadata("pattern", pattern, target, propertyKey);
  } as PropertyDecorator;
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
    if (!propertyKey) {
      throw new Error("The required decorator can only be used on a property.");
    }
    Reflect.defineMetadata("required", true, target, propertyKey);
  };
}

/**
 * A decorator function that sets a property to be read only.
 * @returns
 */
export function readOnly() {
  return function (target: any, propertyKey: string) {
    if (!propertyKey) {
      throw new Error("The readOnly decorator can only be used on a property.");
    }
    Reflect.defineMetadata("readOnly", true, target, propertyKey);
  };
}

/**
 * A sterotype decorator that sets the stereotype for a class.
 * A stereotype is a classification of a class based on its characteristics for use in code generation.
 *
 * Options may include:
 * - grid
 * - object
 * - list
 *
 * However the options are not limited to the above and can be extended as needed.
 * @param stereoTypes
 * @returns
 */
export function stereoTypes(stereoTypes: string[]): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata("stereoTypes", stereoTypes, target);
  };
}

/**
 * The widget decorator sets the widget to be used for a property.
 * @param widget
 * @returns
 */
export function widget(widget: string, options: any): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata("widget", { id: widget, options }, target, propertyKey);
  } as PropertyDecorator;
}

/**
 * Provides widget map
 * @param widgetMap 
 * @returns 
 */
export function widgetMaps(widgetMaps: Reactory.Forms.IWidgetMap[]): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata("widgetMaps", widgetMaps, target);
  }
}

export type FieldLayoutOptionTypes = {} | Reactory.Schema.IGridFieldLayout;

export type FieldOptions = {};

export function fieldLayoutOptions(options: FieldOptions): PropertyDecorator {
  return function (target: any, property: string) {
    return Reflect.defineMetadata("fieldLayoutOptions", options, target, property);
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
export function createInstance<T>(
  type: new (props?: any) => T,
  props?: any
): T {
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
export function getPropertySchema<C, P>(
  instance: C,
  key: string,
  context: Reactory.Server.IReactoryContext
): Reactory.Schema.ISchema {
  //@ts-ignore
  const schema: Reactory.Schema.ISchema = {
    type: "object",
  };

  (schema as Reactory.Schema.ISchema).$type = `${
    (instance as any)?.constructor?.name
  }`;

  //@ts-ignore
  const property = instance[key];

  if (property !== null && property !== undefined) {
    const titleKey = Reflect.getMetadata("title", instance, key);
    if (titleKey) {
      schema.title = titleKey;
      if (context) {
        const translation = context.i18n.t(titleKey);
        if (translation) {
          schema.title = translation;
        }
      }
    }

    const descriptionKey = Reflect.getMetadata("description", instance, key);
    if (descriptionKey) {
      schema.description = descriptionKey;
      if (context) {
        const translation = context.i18n.t(descriptionKey);
        if (translation) {
          schema.description = translation;
        }
      }
    }

    const format = Reflect.getMetadata("format", instance, key);
    if (format) {
      schema.format = format;
    }

    const isReadOnly: boolean = Reflect.getMetadata("readOnly", instance, key);
    schema.readonly = isReadOnly === true;

    const isRequired = Reflect.getMetadata("required", instance, key);
    if (isRequired) {
      schema.required = isRequired === true;
    }

    const defaultValue = Reflect.getMetadata("defaultValue", instance, key);
    if (defaultValue) {
      schema.default = defaultValue;
    }

    const enumType = Reflect.getMetadata("enumType", instance, key);
    if (enumType) {
      schema.enum = Reflect.getMetadata("enumValues", instance, key);
    }

    //@ts-ignore
    if (instance[key]?.constructor === Number) {
      const min = Reflect.getMetadata("min", instance, key);
      const max = Reflect.getMetadata("max", instance, key);
      if (min) {
        (schema as Reactory.Schema.INumberSchema).minimum = min;
      }
      if (max) {
        (schema as Reactory.Schema.INumberSchema).maximum = max;
      }
      //@ts-ignore
    } else if (property[key]?.constructor === Date) {
      const min = Reflect.getMetadata("min", instance, key);
      const max = Reflect.getMetadata("max", instance, key);
      if (min) {
        (schema as Reactory.Schema.INumberSchema).minimum = min;
      }
      if (max) {
        (schema as Reactory.Schema.INumberSchema).maximum = max;
      }

      schema.type = "string";
      schema.format =
        Reflect.getMetadata("format", instance, key) || "date-time";
      //@ts-ignore
    } else if (instance[key]?.constructor === String) {
      const min = Reflect.getMetadata("min", instance, key);
      const max = Reflect.getMetadata("max", instance, key);
      const pattern = Reflect.getMetadata("pattern", instance, key);
      if (min) {
        (schema as Reactory.Schema.IStringSchema).minLength = min;
      }
      if (max) {
        (schema as Reactory.Schema.IStringSchema).maxLength = max;
      }

      if (pattern) {
        (schema as Reactory.Schema.IStringSchema).pattern = pattern;
      }

      schema.type = "string";
    } else if (typeof property === "boolean") {
      schema.type = "boolean";
    } else if (typeof property === null || typeof property === undefined) {
      // enum types report as null
      // extract the enum values from the
      // metadata
      const enumType = Reflect.getMetadata("enumType", property);
      if (enumType) {
        schema.enum = Reflect.getMetadata("enumValues", property);
      } else {
        schema.enum = [];
      }
    } else if (Array.isArray(property)) {
      //schema.type = Reflect.getMetadata('design:nullable', type) ? ["array", "null"] : "array";
      schema.type = "array";
      const itemType = Reflect.getMetadata("itemType", instance);
      if (itemType) {
        schema.items = getSchema(itemType, property, context);
      }
    } else if (typeof property === "object" && property !== null) {
      // schema.type = Reflect.getMetadata('design:nullable', type) ? ["object", "null"] : "object";
      schema.type = "object";
      schema.properties = {};
      schema.required = [];

      for (const _key in property as any) {
        //@ts-ignore
        if (property.hasOwnProperty(_key)) {
          //@ts-ignore
          // propertySchema.type = Reflect.getMetadata('design:nullable', type, key) === true ? [propertySchema.type, "null"] : propertySchema.type;
          schema.properties[_key] = getPropertySchema(property, _key, context);
        }
      }
    }
  }
  return schema;
}

export function getSchema<C>(
  clazz: { new (props: Partial<C>): C },
  props: Partial<C>,
  context: Reactory.Server.IReactoryContext
): Reactory.Schema.ISchema {
  const instance: C = new clazz(props);
  const schema: Reactory.Schema.ISchema = {
    type: "object",
    description: "",
    title: clazz.name,
    default: instance,
    properties: {},
  };

  // check reflect metadata for the class
  const titleKey = Reflect.getMetadata("formTitle", clazz);
  if (titleKey) {
    schema.title = titleKey;
    if (context) {
      const translation = context.i18n.t(titleKey);
      if (translation) {
        schema.title = translation;
      }
    }
  }

  const descriptionKey = Reflect.getMetadata("formDescription", clazz);
  if (descriptionKey) {
    schema.description = descriptionKey;
    if (context) {
      const translation = context.i18n.t(descriptionKey);
      if (translation) {
        schema.description = translation;
      }
    }
  }

  // check each property for metadata
  for (const key in instance) {
    if (instance.hasOwnProperty(key)) {
      schema.properties[key] = getPropertySchema(instance, key, context);
    }
  }

  return schema;
}

export function getPropertyUISchema<C, P>(
  instance: C,
  key: string,
  stereoType: Reactory.Schema.UISchemaStereotype,
  context: Reactory.Server.IReactoryContext
): Reactory.Schema.IFormUISchema {
  const uiSchema: Reactory.Schema.IFormUISchema = {};

  // @ts-ignore
  const property = instance[key];

  if (property !== null && property !== undefined) {
  
    const enumType = Reflect.getMetadata("enumType", instance, key);
    if (enumType) {
      const enumValues = Reflect.getMetadata("enumValues", instance, key);
      uiSchema['ui:widget'] = 'SelectWidget'; 
      uiSchema['ui:options'] = { 
        selectOptions: enumValues.map((v: any) => ({ key: v.key, value: v.value, label: context.i18n.t(v.label) }))
      }
    }

    //@ts-ignore
    if (instance[key]?.constructor === Number) {
      //@ts-ignore
    } else if (property[key]?.constructor === Date) {
      //@ts-ignore
    } else if (instance[key]?.constructor === String) {
    } else if (typeof property === "boolean") {
      //
    } else if (typeof property === null || typeof property === undefined) {
      // enum types report as null
      // extract the enum values from the
      // metadata
    } else if (Array.isArray(property)) {
      //schema.type = Reflect.getMetadata('design:nullable', type) ? ["array", "null"] : "array";
    } else if (typeof property === "object" && property !== null) {
      // schema.type = Reflect.getMetadata('design:nullable', type) ? ["object", "null"] : "object";
    }
  
    const widget = Reflect.getMetadata("widget", instance, key);
    if (widget) {
      uiSchema["ui:widget"] = widget.id;
      if (typeof widget.options === 'function') {
        uiSchema["ui:options"] = widget.options(context);
      } else {
        uiSchema["ui:options"] = widget.options;
      }
    }
  }

  return uiSchema;
}

export function getUISchema<C>(
  clazz: {
    new (props: Partial<C>): C;
  },
  props: Partial<C>,
  stereoType: Reactory.Schema.UISchemaStereotype,
  context: Reactory.Server.IReactoryContext
): Reactory.Schema.IFormUISchema {
  const instance: C = new clazz(props);
  const uiSchema: Reactory.Schema.IFormUISchema = {};
  
  // check reflect metadata for the class

  // check each property for metadata
  for (const key in instance) {
    if (instance.hasOwnProperty(key)) {
      const property = instance[key];
      uiSchema[key] = getPropertyUISchema(instance, key, stereoType, context);
    }
  }

  switch(stereoType) {
    case "grid":
      uiSchema["ui:field"] = "GridLayout";
      let rowSpecs: Reactory.Schema.IGridLayout = {   };
      for (const key in instance) {
        rowSpecs[key] = {xs: 12, sm: 6, md: 4, lg: 3, xl: 2, style: {}};
      }
      uiSchema["ui:grid-layout"] = [rowSpecs];
      break;
    case "list":
      uiSchema["ui:field"] = "ListLayout";
      break;
    case "tab":
      uiSchema["ui:field"] = "TabLayout";
      break;
    case "accordion":
      uiSchema["ui:field"] = "AccordionLayout";
      break;
    case "paged": 
      uiSchema["ui:field"] = "PagedLayout";
      break;
    case "stepped":
      uiSchema["ui:field"] = "SteppedLayout";
      break;
  }

  return uiSchema;
}

/**
 * Generates a graph binding for the given type.
 * @param type
 * @returns
 */
export function getGraphBinding<T>(type: {
  new (): T;
}): Reactory.Forms.IFormGraphDefinition {
  const binding: Reactory.Forms.IFormGraphDefinition = {
    clientResolvers: [],
    mutation: {},
    query: {
      name: "",
      text: "",
    },
    queries: {
      default: {
        name: "",
        text: "",
      },
    },
  };

  return binding;
}
