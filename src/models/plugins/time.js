
export default function timeStamp(schema, options) {
  function preSave(next) {
    const { user, partner } = global;
    this.updatedAt = new Date();
    if (!this.createdAt) this.createdAt = new Date();
    next();
  }

  schema.pre('save', preSave);
}
