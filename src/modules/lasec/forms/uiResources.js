export const defaultUiResources = [
  {
    id: 'reactory.plugin.lasec360', 
    name: 'Lasec 360 Forms Plugin', 
    type: 'script', 
    uri: `${process.env.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    required: true,
    expr: '"${props.api.componentRegister["lasec-crm.Lasec360Plugin@1.0.0"].component !== null}"==="true"',    
  },
];

