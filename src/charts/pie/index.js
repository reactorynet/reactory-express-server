

import path from 'path';
import logger from '../../logging';

const ChartjsNode = require('chartjs-node');

const defaultData = {
  datasets: [{
    data: [82, 18],
  }],

  // These labels appear in the legend and in the tooltips when hovering different arcs
  labels: [
    'Avg Score',
  ],

  backgroundColor: [
    `${global.partner.themeOptions.palette.primary.main}`,
    'rgba(0,0,0,0)',
  ],
};

const defaultOptions = {
  cutoutPercentage: 50,
};

export const DefaultPieChart = (props) => {
  logger.debug('Generating default PieChart', props);
  const {
    folder, file, width, height, resolveCDN = false, data, options,
  } = props;
  const outputpath = path.join(folder, file);
  return new Promise((resolve, reject) => {
    const chartNode = new ChartjsNode(width || 250, height || 250);
    chartNode.drawChart({
      type: 'pie',
      data: data || defaultData,
      options: options || defaultOptions,
    }).then(() => {
      // chart is created
      // get image as png buffer
      return chartNode.getImageBuffer('image/png');
    }).then((buffer) => {
      Array.isArray(buffer); // => true
      // as a stream
      return chartNode.getImageStream('image/png');
    }).then((streamResult) => {
      // using the length property you can do things like
      // directly upload the image to s3 by using the
      // stream and length properties
      // streamResult.stream; // => Stream object
      // streamResult.length; // => Integer length of stream
      // write to a file
      return chartNode.writeImageToFile('image/png', outputpath);
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
  DefaultPieChart,
};
