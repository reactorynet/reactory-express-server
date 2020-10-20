import { Reactory } from '@reactory/server-core/types/reactory';

export const partnerStyles = (partner: Reactory.IReactoryClient) => {

    return {
        normal: {
            font: 'Verdana',
        },
        default: {
            fontSize: 10,
            font: 'Verdana',
            alignment: 'justify',
            margin: [0, 0, 10, 0],
            lineHeight: 1.5,
            bold: false,
            italics: false,
        },
        sublist: {
            fontSize: 8,
        },
        title: {
            fontSize: 16,
            bold: true,
            font: 'Verdana',
        },
        primary: {
            color: partner.themeOptions.palette.primary1Color,
        },
        secondary: {
            color: partner.themeOptions.palette.secondary.main,
        },
        header: {
            fontSize: 12,
            bold: true,
            font: 'Verdana',
            margin: [0, 15, 0, 15],
        },
        subheader: {
            fontSize: 11,
            bold: true,
            font: 'Verdana',
            margin: [0, 15],
        },
        subheader2: {
            fontSize: 10,
            bold: true,
            font: 'Verdana',
            margin: [0, 15],
        },
        superscript: {
            fontSize: 8,
            margin: [0, 0, 0, 0],
            fontFeatures: ['sups']
        },
        quote: {
            fontSize: 11,
            font: 'Verdana',
            italics: true,
            color: partner.themeOptions.palette.primary1Color,
        },
        centerAligned: {
            alignment: 'center',
        },
        justified: {
            alignment: 'justify',
        },
    };
};