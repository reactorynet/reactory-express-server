

import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

export const bootstrapMaterialResources = [
  {
    framework: 'jquery',
    uri: 'https://code.jquery.com/jquery-3.3.1.min.js',
    async: true,
    name: 'jQuery',
  },
  {
    framework: 'bootstrap',
    uri: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
    type: 'style',
    async: true,
    name: 'main_styles',
  },
  {
    framework: 'bootstrap',
    uri: safeCDNUrl('ui/bootstrap-material-design/css/bootstrap-material-design.css'),
    type: 'style',
    async: true,
    name: 'bootstrap_theme',
  },
  {
    framework: 'bootstrap',
    uri: safeCDNUrl('ui/bootstrap-material-design/js/material.js'),
    type: 'script',
    async: true,
    name: 'bootstrap_theme_js0',
  },
  {
    framework: 'bootstrap',
    uri: safeCDNUrl('ui/bootstrap-material-design/js/ripples.js'),
    type: 'script',
    async: true,
    name: 'bootstrap_theme_js1',
  },
];

