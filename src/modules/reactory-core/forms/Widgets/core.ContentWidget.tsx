const ContentWidget = (props: any) => {

  const { reactory, variant = 'default', schema, uiSchema, idSchema } = props;

  const {
    StaticContent,
    MaterialCore,
    React
  } = reactory.getComponents(['core.StaticContent', 'material-ui.MaterialCore', 'react.React']);
  let $variant = `${idSchema.$id}-${variant}`;

  return (
    <MaterialCore.Paper elevation={0}>
      <StaticContent slug={`core-form-content-widget-${variant}`} propertyBag={{ ...props }} />
    </MaterialCore.Paper>
  );
}

const Definition = {
  name: 'ContentWidget',
  nameSpace: 'core',
  version: '1.0.0',
  component: ContentWidget,
  roles: ['USER'],
  tags: ['user', 'content']
};


//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace,
    Definition.name,
    Definition.version,
    ContentWidget,
    [''],
    Definition.roles,
    true,
    [],
    'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: ContentWidget
  });
}

export default Definition;

