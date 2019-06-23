import path from 'path';
import logger from '../logging';

const ChartjsNode = require('chartjs-node');

// 600x600 canvas size
export default (props) => {
  logger.debug('Generating test chart with props', props);
  const { folder, file } = props;
  const outputpath = path.join(folder, file);
  return new Promise((resolve, reject) => {
    const chartNode = new ChartjsNode(600, 600);
    chartNode.drawChart({
      type: 'line',
      data: [],
      options: {},
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
        resolve({ file: outputpath, cdn: `${process.env.CDN_ROOT}content/images/charts/${file}?${new Date().valueOf()}` });
      });
  });
};
