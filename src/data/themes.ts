import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

const woosparksTheme = {
  name: 'woosparks',
  theme: {
    palette: {
      primary1Color: '#488A99',
      primary: {
        light: '#79BACA',
        main: '#488A99',
        dark: '#4D585C',
        contrastText: '#fff',
      },
      secondary: {
        light: '#ffe087',
        main: '#dbae58',
        dark: '#a77f2a',
        contrastText: '#fff',
      },
      report: {
        empty: '#F7BFBA',
        fill: '#990033',
      },
    },
    assets: {
      login: {
        featureImage: safeCDNUrl('themes/woosparks/images/phoenix.png'),
        logo: safeCDNUrl('themes/woosparks/images/logo.png'),
      },
    },
  },
};

export default [
  woosparksTheme,
];
