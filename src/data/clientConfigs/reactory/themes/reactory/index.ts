import Reactory from '@reactory/reactory-core'
import { ReactoryLayouts } from '@reactory/server-core/data/layouts/index';

const { CDN_ROOT } = process.env;

const DARK_PALETTE: Reactory.UX.ITheme = {
  type: 'material',
  palette: {
    mode: 'dark',    
    primary: {
      light: '#352c54',
      main: '#f95e20',
      dark: '#000001',
      contrastText: '#ffffff',
      colors: [],
    },
    secondary: {
      light: '#a5392a',
      main: '#700000',
      dark: '#430000',
      contrastText: '#ffffff',
      colors: [],
    },
    background: {
      paper: '#424242',
      default: '#424242'
    }
  },
}


const LIGHT_PALETTE: Reactory.UX.ITheme = {
  palette: {
    mode: 'light',
    primary: {
      light: '#c55e00',
      main: '#f95e20',
      dark: '#be2900',
      contrastText: '#000000',
      colors: [],
    },
    secondary: {
      light: '#c55e00',
      main: '#ff8d00',
      dark: '#c55e00',
      contrastText: '#000000',
      colors: [],
    },
    background: {
      paper: '#f9ebc0',
      default: '#d3c7a2'
    }
  },
  type: 'material'
}

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
  layouts: ReactoryLayouts,  
  content: {
    appTitle: 'Reactory - Build Apps. Fast.',
    login: {
      message: 'Building Apps. Just. Like. That.',
    },
  },  
}

export default ReactoryTheme;
  