
export default function timeStamp(schema: any) {

  schema.add({
    createdAt: Date,
    updatedAt: Date,
  })

  function onBeforeSave(next: () => void) {    
    this.updatedAt = new Date();
    if (!this.createdAt) this.createdAt = new Date();
    next();
  }

  schema.pre('save', onBeforeSave);
}
