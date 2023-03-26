import Mongoose from 'mongoose';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';
import { REACTORY_KNOWN_MODEL_MAP } from './constants';


const ReactoryModelMetaSchema = new Mongoose.Schema<
  Reactory.Mongo.IReactoryModelMetaDocument<"ReactoryModelMeta">,
  Reactory.Mongo.ReactoryModelMetaDocument,
  Reactory.Mongo.IResourceManagerProjectDocumentFunctions
>({
  id: ObjectId,
  model: { 
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  }, 
  history: [
    {
      when: Date,
      description: String,
      outcome: String,
      errors: [String]
    }
  ],
  created: Date,
  updated: Date
});


ReactoryModelMetaSchema.methods = {

}

ReactoryModelMetaSchema.statics = {

}


const ReactoryModelMeta: Reactory.Mongo.ReactoryModelMetaDocument = Mongoose.model("ReactoryModelMeta", ReactoryModelMetaSchema)

export default ReactoryModelMeta
