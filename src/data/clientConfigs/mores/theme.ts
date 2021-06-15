
const key = 'mores';

const {
    CDN_ROOT,
} = process.env;


const theme_base = {
    key,
    type: 'material',
    palette: {
        primary1Color: '#52687b',
        grey: {
            light: '#757575',
            main: '#5fb848',
            dark: '#298717',
            contrastText: '#222732',
        },
        error: {
            light: '#C7212D',
            main: '#C7212D',
            dark: '#C7212D',
            contrastText: '#FFFFFF',
        },
        success: {
            light: '#6DB84A',
            main: '#6DB84A',
            dark: '#6DB84A',
            contrastText: '#222732',
        },
        warning: {
            light: '#F6950F',
            main: '#F6950F',
            dark: '#F6950F',
            contrastText: '#323e49',
        },
        info: {
            light: '#49B4D4',
            main: '#49B4D4',
            dark: '#49B4D4',
            contrastText: '#222732',
        },
        primary: {
            light: '#7f96aa',
            main: '#52687b',
            dark: '#85B810',
            contrastText: '#ffffff',
        },
        secondary: {
            light: '#7d983c',
            main: '#7d983c',
            dark: '#7d983c',
            contrastText: '#ffffff',
        },
        report: {
            empty: '#ffffd2',
            fill: '#273e4f',
        },
    },
    assets: {
        featureImage: `${CDN_ROOT}themes/${key}/images/stairs.jpg`,
        logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
        favicon: `${CDN_ROOT}themes/${key}/images/favicon.ico`,
        emailLogo: `${CDN_ROOT}themes/${key}/images/logo.png`,
    },
    content: {
        appTitle: 'Mores Assessments',
        login: {
            message: 'Each one of us has only one precious life',
        },
    },
};

const theme = { ...theme_base };

export default theme;
