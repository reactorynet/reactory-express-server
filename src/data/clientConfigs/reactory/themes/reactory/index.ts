import Reactory from '@reactory/reactory-core'

const { CDN_ROOT } = process.env;

const DARK_PALETTE = {
  palette: {
    mode: 'dark',    
    primary: {
      light: '#352c54',
      main: '#10012b',
      dark: '#000001',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#a5392a',
      main: '#700000',
      dark: '#430000',
      contrastText: '#ffffff',
    },
    background: {
      paper: '#424242',
      default: '#424242'
    }
  },
}


const LIGHT_PALETTE = {
  palette: {
    mode: 'dark',
    primary: {
      light: '#352c54',
      main: '#10012b',
      dark: '#000001',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#a5392a',
      main: '#700000',
      dark: '#430000',
      contrastText: '#ffffff',
    },
    background: {
      paper: '#fff',
      default: '#fff'
    }
  },
}


const ReactoryDefaultLayout: Reactory.UX.IReactoryLayout = {
  name: "Default",
  nameSpace: "reactory",
  version: "1.0.0",
  schema: {
    type: "object",
    properties: {
      header: {
        type: 'string',
      },
      main: {
        type: 'string'
      }      
    }
  },
  uiSchema: {

  }
}

const Layouts: Reactory.UX.IReactoryLayout[] = [
  ReactoryDefaultLayout
]

const ReactoryTheme: Reactory.UX.IReactoryTheme = {
  type: 'material',
  name: 'reactory',
  description: "The default reactory theme",
  defaultThemeMode: 'dark',
  modes: [
    {
      mode: 'dark',
      options: DARK_PALETTE,
      name: 'Reactory Dark',
      description: 'Reactory default dark mode',
      icon: 'night'
    },
    {
      mode: 'light',
      options: LIGHT_PALETTE,
      name: 'Reactory Dark',
      description: 'Reactory default dark mode',
      icon: 'night'
    }
  ],    
  assets: [
    { id: "featureImage", name: 'featureImage', url: `${CDN_ROOT}themes/reactory/images/phoenix.png`, assetType: "image",  },
    { id: 'logo', name: 'logo', url: `${CDN_ROOT}themes/reactory/images/logo.png`, assetType: 'image' },
    { id: 'favicon', name: 'favicon', url: `${CDN_ROOT}themes/reactory/images/favicon.png`, assetType: 'image' },
    { id: 'avatar', name: 'avatar', url: `${CDN_ROOT}themes/reactory/images/avatar.png`, assetType: 'image' },
  ],
  layouts: Layouts,
  
  content: {
    appTitle: 'Reactory - Build Apps. Fast.',
    login: {
      message: 'Building Apps. Just. Like. That.',
    },
  },  
}

export default ReactoryTheme;
  