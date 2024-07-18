
import { DatePickerProps } from '@mui/lab';
import { FilledInputProps, InputProps } from '@mui/material';
import { minmalExtendedOptions } from '../froala';

const datePickerProps: Partial<DatePickerProps> = {
  mask: '____-__-__'
}

export const fullEditor: Reactory.Schema.IFormUISchema = {
  'ui:options': {
    containerType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: true,
    showHelp: true,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      slug: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      title: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      publishDate: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      published: {
        xs: 12, sm: 12, md: 6, lg: 6
      },
      content: { xs: 12, sm: 12, md: 12, lg: 12 }
    },
  ],

  slug: {
    // ? slug wiget?
  },
  publishDate: {
    'ui:widget': 'DateSelectorWidget',
    'ui:options': datePickerProps
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions: minmalExtendedOptions,
    },
  },
  topics: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      container: 'core.BasicContainer',
      containerProps: {
        title: 'Page Tags',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  }
}