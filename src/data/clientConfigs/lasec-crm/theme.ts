const {
    CDN_ROOT,
    MODE = 'DEVELOP',
    API_URI_ROOT,
    LASEC_360_URL = 'http://localhost:3001',
    REACTORY_CLIENT_URL = 'http://localhost:3000',
    LASEC360DB_HOST = 'localhost',
    LASEC360DB_USER = 'reactory',
    LASEC360DB_PASSWORD = 'reactory_password',
    LASEC360DB_DATABASE = 'lasec360',
    LASEC360DB_PORT = 3306
  } = process.env;


const key = 'lasec-crm';

const theme = {
    typography: {
      useNextVariants: true,
      fontSize: 12,
    },
    '@global': {
      '@media (min-width: 600px)': {
        'MuiToolbar-regular': {
          minHeight: '48px'
        }
      }
    },
    overrides: {
      MuiAppBar: {
        colorPrimary: {
          color: '#222732',
          backgroundColor: "#fff",
          '@media (prefers-color-scheme: dark)': {
            color: '#fff',
            backgroundColor: "#424242",
          }
        }
      },
      MuiToolbar: {
        regular: {
          minHeight: '48px'
        },
      },
      MuiTableCell: {
        head: {
          backgroundColor: "#E1E1E4 !important",
          fontWeight: 700
        },
        root: {
          verticalAlign: 'top',
          border: '1px solid #E1E1E4',    
          fontWeight: 700,
          padding: '8px'      
        },
        body: {
            //fontSize: '12'
        }
      },      
      MuiBox: {
        root: {
          padding: '0px',
          paddingTop: '8px'
        }
      },            
    },
    type: 'material',
    palette: {
      type: 'light',
      primary1Color: '#5fb848',
      grey: {
        light: '#757575',
        main: '#5fb848',
        dark: '#298717',
        contrastText: '#222732',
      },      
      error: {
        light: '#D22D2C',
        main: '#D22D2C',
        dark: '#D22D2C',
        contrastText: '#FFFFFF',
      },      
      success: {
        light: '#5EB848',
        main: '#5EB848',
        dark: '##5EB848',
        contrastText: '#FFFF',
      },
      warning: {
        light: '#FF9901',
        main: '#FF9901',
        dark: '#FF9901',
        contrastText: '#FFFFFF',
      },      
      info: {
        light: '#22B2D4',
        main: '#22B2D4',
        dark: '#22B2D4',
        contrastText: '#FFFFFF',
      },
      primary: {
        light: '#92eb77',
        main: '#5fb848',
        dark: '#298717',
        contrastText: '#222732',        
      },
      secondary: {
        light: '#62b4b8',
        main: '#2d8488',
        dark: '#00575b',
        contrastText: '#222732',
        default: '#757575',
      },
      background: {
        Paper: '#f6f6f6',
        default: '#d3d3d3',
        light: {
          Paper: '#f6f6f6',
          default: '#d3d3d3',
        },
        dark: {
          Paper: '#f6f6f6',
          default: '#d3d3d3',
        }
      }          
    },
    provider: {
      material: {
        typography: {
          useNextVariants: true,
        },
        type: 'material',
        palette: {
          primary1Color: '#369907',
          primary: {
            light: '#6dcb43',
            main: '#6EB84A',
            dark: '#006a00',
            contrastText: '#000000',
          },
          secondary: {
            light: '#62b4b8',
            main: '#2d8488',
            dark: '#00575b',
            contrastText: '#000000',
          },
          report: {
            empty: '#89ee8e',
            fill: '#ff8c63',
          },
        },
      },
      bootstrap: {

      },
      blueprint: {

      },
      mockly: {

      },
    },
    core: {
      images: [
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1280x1024.jpg`,
          aspect: '16:9', // 16:9
          orientation: 'landscape',
          size: {
            width: 1280,
            height: 1024,
          },
        },
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1024x1280.jpg`,
          aspect: '9:16', // 16:9
          orientation: 'portrait',
          size: {
            width: 1024,
            height: 1280,
          },
        },
      ],
      background: {
        color: '',
        image: '',
        alpha: 0.4,
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      emailLogo: `${CDN_ROOT}themes/${key}/images/logo_small.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
      icons: {
        Icon512: `${CDN_ROOT}themes/${key}/images/icons-512.png`,
        Icon192: `${CDN_ROOT}themes/${key}/images/icons-192.png`,
        Icon144: `${CDN_ROOT}themes/${key}/images/icons-144.png`,
      },
    },
    content: {
      appTitle: 'Lasec CRM',
      login: {
        message: `${key} powered by reactory.net`,
      },
    },
    MaterialTableWidget: {
      rowStyle: {
        backgroundColor: '#E7E7E7'
      },
      altRowStyle: {
        backgroundColor: '#FAFAFA'
      },
      selectedRowStyle: {
        backgroundColor: '#DFF1FF'
      }
    },
    MaterialTextField: {
      variant: 'outlined'
    },
    MaterialInput: {
      variant: 'outlined'
    }
  };

  export default theme;