

import path from 'path';
import logger from '../../logging';

//@ts-ignore
import ChartjsNode from 'chartjs-node';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// 600x600 canvas size
export const DefaultBarChart = (props: any) => {
  const {
    folder, file, width, height, resolveCDN = false, data, options,
    mime = 'image/png',
  } = props;

  const outputpath = path.join(folder, file);
  logger.debug(`Generating default BarChart ${outputpath}`);
  return new Promise((resolve, reject) => {
    const chartNode = new ChartjsNode(width || 400, height || 400);
    chartNode.drawChart({
      type: 'bar',
      data,
      plugins: [ChartDataLabels],
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true,
            },
          }],
        },
        ...options,
      },
    }).then(() => {
      // chart is created
      // get image as png buffer
      return chartNode.getImageBuffer(mime);
    }).then((buffer: any[]) => {
      Array.isArray(buffer); // => true
      // as a stream
      return chartNode.getImageStream(mime);
    }).then((streamResult: any) => {
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
  DefaultBarChart,
};
