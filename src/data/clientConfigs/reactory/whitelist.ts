const development = ['localhost']
const production = ['app.reactory.net']

const whitelist = process.env.MODE === "production" ? production : development;

export default whitelist;