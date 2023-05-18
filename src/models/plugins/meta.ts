
export default function meta(schema: any) {
  schema.add({
    meta: { 
      owner: String,  
    }
  })
  function onBeforeSave(next: () => void) {
    if (!this.meta) {
      this.meta = {
        owner: 'system'
      };
    }
    next();
  }
  schema.pre('save', onBeforeSave);
}
