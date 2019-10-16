
export default function meta(schema, options) {
  function preSave(next) {
    const { user, partner } = global;
    if (!this.meta) this.meta = {
      owner: partner ? partner.key : 'system'
    };
    next();
  }

  schema.pre('save', preSave);
}
