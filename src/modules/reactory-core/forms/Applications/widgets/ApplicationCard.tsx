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

/**
 * Default height (in pixels) of the collapsed application introduction.
 * When the rendered content is taller than this it is clamped and a
 * "Show more" / "Show less" toggle is rendered below it. Override per
 * usage with `ui:options.collapsedHeight`.
 */
const DEFAULT_COLLAPSED_HEIGHT = 160;

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
    Grid2,
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
    Box,
  } = Material.MaterialCore;

  const {
    MoreVert,
    ExpandMore,
    ExpandLess,
  } = Material.MaterialIcons

  const {    
    useNavigate
  } = ReactRouter

  const navigation = useNavigate();

  let options: any = {
    sizes: { xs: 12, sm: 12, md: 6, lg: 4, xl: 4 },
    moreRoute: "/application/${id}?tab=overview" 
  }

  if(uiSchema && uiSchema["ui:options"]) {
    options = {...options, ...uiSchema["ui:options"]}
  }

  // --- Expand / collapse configuration ---------------------------------------
  // The introduction content is authored (as StaticContent) and may be arbitrarily
  // long, which previously stretched a card well beyond its neighbours. The widget
  // now clamps the introduction to `collapsedHeight` and offers a toggle when the
  // content actually overflows.
  const collapsible: boolean = options.collapsible !== false;
  const collapsedHeight: number = typeof options.collapsedHeight === 'number'
    ? options.collapsedHeight
    : DEFAULT_COLLAPSED_HEIGHT;

  const expandText: string = options.expandLabel
    || reactory.i18n.t("reactory:reactory.applications.expand", { defaultValue: "Show more" });
  const collapseText: string = options.collapseLabel
    || reactory.i18n.t("reactory:reactory.applications.collapse", { defaultValue: "Show less" });

  // Hooks are declared before the early return so the hook order stays stable for
  // the lifetime of the component (the list container may recycle instances).
  const introRef = React.useRef(null);
  const [ descriptionExpanded, setDescriptionExpanded ] = React.useState(false);
  const [ descriptionOverflows, setDescriptionOverflows ] = React.useState(false);

  /**
   * Determine whether the rendered introduction is taller than the collapsed height.
   * `scrollHeight` reports the full natural content height even while a `max-height`
   * clamp is applied, so the result is identical in both the collapsed and expanded
   * states and the toggle does not disappear when the user expands the card.
   */
  const measureDescription = React.useCallback(() => {
    const el: any = introRef.current;
    if (!el) return;
    setDescriptionOverflows(el.scrollHeight > collapsedHeight + 2);
  }, [collapsedHeight]);

  React.useEffect(() => {
    if (!collapsible) {
      setDescriptionOverflows(false);
      return undefined;
    }

    measureDescription();

    // StaticContent resolves its content asynchronously, so re-measure shortly after
    // mount in addition to the resize observer.
    const timers = [
      window.setTimeout(measureDescription, 150),
      window.setTimeout(measureDescription, 600),
    ];

    let observer: any = null;
    const el: any = introRef.current;
    if (typeof ResizeObserver !== 'undefined' && el) {
      observer = new ResizeObserver(() => measureDescription());
      // Observe the wrapper and its rendered children: while the wrapper is clamped
      // its own height does not change as the content grows, but the children do.
      observer.observe(el);
      for (let i = 0; i < el.children.length; i++) {
        observer.observe(el.children[i]);
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (observer) observer.disconnect();
    };
  }, [ measureDescription, collapsible, formData ]);

  if(formData === null || formData === undefined) return null;

  const {
    id = '',
    avatar = '',
    logo,
    title,
    url = ''
  } = formData;

  let variant = 'user'
  if(reactory.hasRole(['APPLICATION_ADMIN']) === true) {
    variant = 'admin'
  }

  const default_intro: string = reactory.i18n.t("reactory:reactory.applications.emptyIntro");
  const launchText: string = reactory.i18n.t("reactory:reactory.applications.launch");
  const moreText: string = reactory.i18n.t(`reactory:reactory.applications.more-${variant}`);

  const introContentId = `application_card_intro_${idSchema.$id}_${id}`;
  // Clamp as soon as we know the widget is collapsible so there is no flash of the full
  // description before the first measurement; only surface the toggle once overflow has
  // actually been detected (short introductions therefore render unadorned).
  const clampDescription: boolean = collapsible && !descriptionExpanded;
  const showToggle: boolean = collapsible && descriptionOverflows;

  // Theme-aware fade so the clipped content blends into the card surface.
  const theme: any = (reactory as any).muiTheme;
  const cardBackground: string = theme?.palette?.background?.paper
    || theme?.palette?.background?.default
    || 'transparent';

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
    <Card 
      id={`application_card_${idSchema.$id}_${formData.id}`} 
      key={formData.id}>
      <CardHeader {...headerProps} />
      <CardMedia 
        component="img" 
        height={240}
        width="100%"
        image={logo}
        alt={title}
      />
      <CardContent>        
        <Box
          sx={{
            position: 'relative',
            maxHeight: clampDescription ? collapsedHeight : 'none',
            overflow: 'hidden',
            transition: 'max-height 300ms ease',
          }}
        >
          <Box id={introContentId} ref={introRef}>
            <StaticContent slug={`reactory-application-intro-${reactory.utils.slugify(title)}`} defaultValue={<p>{default_intro}</p>} />
          </Box>
          {
            clampDescription && descriptionOverflows ? (
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 48,
                  pointerEvents: 'none',
                  background: `linear-gradient(to bottom, transparent, ${cardBackground})`,
                }}
              />
            ) : null
          }
        </Box>
        {
          showToggle ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                size="small"
                color="inherit"
                onClick={() => setDescriptionExpanded((value: boolean) => !value)}
                aria-expanded={descriptionExpanded}
                aria-controls={introContentId}
                endIcon={descriptionExpanded ? <ExpandLess /> : <ExpandMore />}
              >
                {descriptionExpanded ? collapseText : expandText}
              </Button>
            </Box>
          ) : null
        }
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
