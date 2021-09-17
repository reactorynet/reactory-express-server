
const key = 'yellowspot';

const {
    CDN_ROOT,
} = process.env;


const theme_base = {
    key,
    type: 'material',
    palette: {
        primary1Color: '#6ec1e4',
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
            light: '#a2f4ff',
            main: '#6ec1e4',
            dark: '#85B810',
            contrastText: '#000000',
        },
        secondary: {
            light: '#54595f',
            main: '#80868c',
            dark: '#2b3035',
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
};

const theme = { ...theme_base };

export default theme;
