'use strict';
interface IComponentsImport { 
  StaticContent: Reactory.Client.Components.StaticContentWidget,
  React: Reactory.React,
  ReactRouter: Reactory.Routing.ReactRouter,
  Material: Reactory.Client.Web.IMaterialModule
}

interface IApplication {
  id: string,
  avatar: string,
  logo: string,
  title: string,
  url: string,
  description: string
}

interface IApplicationDashboard {
  message: string,
  applications: IApplication[]
}

interface IApplicationCardProps {
  reactory: Reactory.Client.IReactoryApi,
  formData: IApplication,
  schema: Reactory.Schema.ISchema,
  uiSchema: Reactory.Schema.IUISchema,
  idSchema: Reactory.Schema.IDSchema,
  onChange: (formData: IApplication) => void  
}

const ApplicationCard = (props: IApplicationCardProps) => {

  const { reactory, formData = null, uiSchema, idSchema } = props;

  const {
    StaticContent,
    Material,
    React,
    ReactRouter,
  } = reactory.getComponents<IComponentsImport>([
    'core.StaticContent',
    'material-ui.Material', 
    'react.React', 
    'react-router.ReactRouter'
  ]);

  const { 
    Paper,
    Grid,
    Avatar,
    Card,
    CardMedia,
    CardActions,
    CardHeader,
    CardContent,
    CardActionArea,
    Typography,
    Button,
    IconButton,
  } = Material.MaterialCore;

  const {
    MoreVert
  } = Material.MaterialIcons

  const {    
    useNavigate
  } = ReactRouter

  const navigation = useNavigate();

  if(formData === null || formData === undefined) return null;

  const {
    id = '',
    avatar = '',
    logo,
    title,
    url = ''
  } = formData;



  let options = {
    sizes: { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 },
    moreRoute: "/applications/${id}/details" 
  }

  if(uiSchema && uiSchema["ui:options"]) {
    options = {...options, ...uiSchema["ui:options"]}
  }

  let variant = 'user'
  if(reactory.hasRole(['APPLICATION_ADMIN']) === true) {
    variant = 'admin'
  }

  const default_intro: string = reactory.i18n.t("reactory:reactory.applications.emptyIntro");
  const launchText: string = reactory.i18n.t("reactory:reactory.applications.launch");
  const moreText: string = reactory.i18n.t(`reactory:reactory.applications.more-${variant}`);

  const onLaunchApp = () => {
    
    window.location.assign(url);
  }

  const onViewMoreApp = () => {
    navigation(reactory.utils.template(options.moreRoute)({ id }))
  }

  const headerProps = {
    avatar: <Avatar src={formData.avatar} alt={`${formData.title} avatar`}></Avatar>,
    title,
    action: <IconButton onClick={onViewMoreApp}><MoreVert /></IconButton>
  };

  return (
    <Card id={`application_card_${idSchema.$id}_${formData.id}`} key={formData.id}>
      <CardHeader {...headerProps} />
      <CardMedia 
        component="img" 
        height={240}
        image={logo}
        alt={title}
      />
      <CardContent>        
        <StaticContent slug={`reactory-application-intro-${reactory.utils.slugify(title)}`} defaultValue={<p>{default_intro}</p>} />
      </CardContent>      
      <CardActions>
        <Button size="small" onClick={onLaunchApp}>{launchText}</Button>
        <Button size="small" onClick={onViewMoreApp}>{moreText}</Button>
      </CardActions>                            
    </Card>
  );
}

const ComponentDefinition = {
  name: 'ApplicationCard',
  nameSpace: 'core',
  version: '1.0.0',
  component: ApplicationCard,
  roles: ['USER'],
  tags: ['user', 'content']
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;


//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationCard,
    [''],
    ComponentDefinition.roles,
    true,
    [],
    'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: ApplicationCard
  });
}