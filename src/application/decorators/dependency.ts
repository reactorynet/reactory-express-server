function dependency(id: string) {
  return function (target: any, fieldName: string) {
    // Check if the class has the static reactory field
    if (!target.constructor.reactory) {
      throw new Error(
        `Dependency decorator can only be used in classes with the Service decorator, or 
        that has a static reactory field.`
      );
    }

    // Create an entry in the dependencies array
    const dependency = { id, alias: fieldName };
    target.constructor.reactory.dependencies ??= [];
    target.constructor.reactory.dependencies.push(dependency);

    // Create a function on the target class called setFieldName
    target[`set${capitalizeFirstLetter(fieldName)}`] = function (value: any) {
      this[fieldName] = value;
    };
  };
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export { dependency };
