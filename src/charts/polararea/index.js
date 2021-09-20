

import path from 'path';
import fs from 'fs';
import logger from '../../logging';

const { CanvasRenderService } = require('chartjs-node-canvas');

const ChartjsNode = require('chartjs-node');


const defaultData = {
  labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
  datasets: [{
    label: '# of Votes',
    data: [12, 19, 3, 5, 2, 3],
    backgroundColor: [
      'rgba(255, 99, 132, 0.2)',
      'rgba(54, 162, 235, 0.2)',
      'rgba(255, 206, 86, 0.2)',
      'rgba(75, 192, 192, 0.2)',
      'rgba(153, 102, 255, 0.2)',
      'rgba(255, 159, 64, 0.2)',
    ],
    borderColor: [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
    ],
    borderWidth: 1,
  }],
};

const defaultOptions = {

};

// 600x600 canvas size
export const DefaultPolarAreaChart = async (props) => {
  logger.debug('Generating default RadarChart', props);
  const {
    folder,
    file,
    width = 400,
    height = 400,
    resolveCDN = false,
    data,
    options,
    canvas = false,
    mime = 'application/pdf',
  } = props;
  const outputpath = path.join(folder, file);
  const chartData = { ...data };
  const chartconfig = {
    type: 'polarArea',
    data: chartData,
    options: { ...defaultOptions, ...options },
  };

  if (canvas === true) {
    const configuration = chartconfig;

    const chartCallback = (ChartJS) => {
    // Global config example: https://www.chartjs.org/docs/latest/configuration/
      logger.debug('ChartJS callback', ChartJS);
      ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
      ChartJS.defaults.global.defaultFontSize = 18;
      // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
      ChartJS.plugins.register({
        // plugin implementation
      });
      // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
      ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
        // chart implementation
      });
    };

    logger.debug('Rendering via Canvas Service');
    try {
      const canvasRenderService = new CanvasRenderService(width, height, chartCallback);
      logger.debug('Have service will render');
      // const image = await canvasRenderService.renderToBuffer(configuration, mime);
      logger.debug('Image rendered to buffer skipped');
      // fs.writeFileSync(outputpath, image);
      // logger.debug(`Image written to file ${ouputpath}`);
      const dataUrl = await canvasRenderService.renderToDataURL(configuration, mime).then();
      const buffer = Buffer.from(dataUrl.split(/,\s*/)[1], 'base64');
      fs.writeFileSync(outputpath, buffer);
      // const stream = canvasRenderService.renderToStream(configuration);
      logger.debug('Rendered file via CANVAS');
      return Promise.resolve({ file: outputpath, dataUrl });
    } catch (error) {
      logger.error('Some rendering error', error);
    }
  }

  return new Promise((resolve, reject) => {
    const chartNode = new ChartjsNode(width || 400, height || 400);
    chartNode.drawChart(chartconfig).then(() => {
      // chart is created
      // get image as png buffer
      return chartNode.getImageBuffer(mime);
    }).then((buffer) => {
      Array.isArray(buffer); // => true
      // as a stream
      return chartNode.getImageStream(mime);
    }).then((streamResult) => {
      // using the length property you can do things like
      // directly upload the image to s3 by using the
      // stream and length properties
      // streamResult.stream; // => Stream object
      // streamResult.length; // => Integer length of stream
      // write to a file
      return chartNode.writeImageToFile(mime, outputpath);
    })
      .then(() => {
        // chart is now written to the file path
        // ./testimage.png
        chartNode.destroy();
        let additional = {};
        if (resolveCDN === true) {
          additional = {
            cdn: `${process.env.CDN_ROOT}content/images/charts/${file}?${new Date().valueOf()}`,
          };
        }
        resolve({ file: outputpath, ...additional });
      });
  });
};


export default {
  DefaultRadarChart: DefaultPolarAreaChart,
};
