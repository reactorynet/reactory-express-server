
export default function meta(schema, options) {
  function preSave(next) {
    if (!this.meta) this.meta = {
      owner: 'system'
    };
    next();
  }

  schema.pre('save', preSave);
}
