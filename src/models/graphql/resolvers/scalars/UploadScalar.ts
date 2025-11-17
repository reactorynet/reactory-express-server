import { GraphQLScalarType, GraphQLError } from 'graphql';

// Since we can't import GraphQLUpload due to version issues, 
// we'll create our own Upload scalar that works with our multipart handler
const UploadScalar = new GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  // Pass through the file object as-is from our multipart handler
  serialize: (value: any) => {
    if (!value) {
      throw new GraphQLError('Upload scalar cannot serialize null/undefined value');
    }
    return value;
  },
  parseValue: (value: any) => {
    // This is called when the value comes from variables (which is our case)
    if (!value) {
      throw new GraphQLError('Upload scalar cannot parse null/undefined value');
    }
    return value;
  },
  parseLiteral: () => {
    throw new GraphQLError('Upload scalar literals are not supported - use variables instead');
  }
});

export default UploadScalar;
