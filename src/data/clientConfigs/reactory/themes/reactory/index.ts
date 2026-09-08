import Reactory from '@reactorynet/reactory-core'
import { ThemeOptions } from '@mui/material/styles';
import { ReactoryLayouts } from '@reactory/server-core/data/layouts/index';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

/**
 * Global MUI component default-prop overrides applied to every Reactory
 * theme mode (light & dark). The Material UI theming system allows
 * default props to be set per-component via `theme.components.<Component>.defaultProps`.
 *
 * Here we default form related components (buttons, button groups, etc.)
 * to the "contained" variant so that forms rendered through the default
 * Reactory theme present a solid/contained style out of the box, rather
 * than the MUI default "text" style.
 */
const FORM_COMPONENT_OVERRIDES: ThemeOptions['components'] = {
  MuiButton: {
    defaultProps: {
      variant: 'contained',
    },
  },
  MuiButtonGroup: {
    defaultProps: {
      variant: 'contained',
    },
  },
  MuiToggleButtonGroup: {
    defaultProps: {
      exclusive: true,
    },
  },
  MuiFab: {
    defaultProps: {
      variant: 'circular',
    },
  },
  // Input-style form controls default to "filled" — MUI's closest equivalent
  // to a "contained" look for inputs, since TextField/Select/FormControl
  // only support 'standard' | 'outlined' | 'filled' (no literal 'contained').
  // A solid background fill mirrors the same contained/solid visual language
  // used by MuiButton above.
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
  },
  MuiSelect: {
    defaultProps: {
      variant: 'outlined',
    },
  },
  MuiFormControl: {
    defaultProps: {
      variant: 'outlined',
    },
  },
};

const DARK_PALETTE: Reactory.UX.ITheme & ThemeOptions = {
  type: 'material',
  components: FORM_COMPONENT_OVERRIDES,
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
    },
    text: {
      primary: '#ffffff'
    }
  },
}


const LIGHT_PALETTE: Reactory.UX.ITheme & ThemeOptions = {
  components: FORM_COMPONENT_OVERRIDES,
  palette: {
    mode: 'light',
    primary: {
      light: '#c55e00',
      main: '#ff8d00',
      dark: '#be2900',
      contrastText: '#000000',
      colors: [],
    },
    secondary: {
      light: '#9968ED',
      main: '#ff8d00',
      dark: '#c55e00',
      contrastText: '#000000',
      colors: [],
    },
    background: {
      paper: '#ffffff',
      default: '#ffffff'
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
      name: 'Reactory Light',
      description: 'Reactory default light mode',
      icon: 'day'
    }
  ],    
  assets: [
    { id: "featureImage", name: 'featureImage', url: safeCDNUrl(`themes/reactory/images/phoenix.png`), assetType: "image",  },
    { id: 'logo', name: 'logo', url: safeCDNUrl(`themes/reactory/images/logo.png`), assetType: 'image' },
    { id: 'favicon', name: 'favicon', url: safeCDNUrl(`themes/reactory/images/favicon.png`), assetType: 'image' },
    { id: 'avatar', name: 'avatar', url: safeCDNUrl(`themes/reactory/images/avatar.png`), assetType: 'image' },
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
  