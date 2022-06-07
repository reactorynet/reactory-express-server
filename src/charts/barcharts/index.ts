

import path from 'path';
import fs from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '../../logging';



export const BarChart = async (props: Reactory.IChartProps): Promise<Reactory.IChartResult> => {
  const {
    folder,
    file,
    width,
    height,
    resolveCDN = false,
    data,
    options,
    mime = 'image/png',
  } = props;

  const outputpath: fs.PathLike = path.join(folder, file);
  logger.debug(`Generating default BarChart ${outputpath}`);


  //const chartNode = new ChartjsNode(width || 400, height || 400);
  const chartNode = new ChartJSNodeCanvas({
    height: height || 400,
    width: width || 400,
    type: 'pdf',
  });

  const stream = chartNode.renderToStream({
    type: 'bar',
    data,
    //plugins: [ChartDataLabels],
    options: {
      scales: {
        yAxes: {
          ticks: {
            beginAtZero: true,
          },
        },
      },
      ...options,
    }
  }, mime);

  let $fileStream = fs.createWriteStream(outputpath);

  stream.pipe($fileStream);
  $fileStream.close();

  let additional = {};
  if (resolveCDN === true) {
    additional = {
      cdn: `${process.env.CDN_ROOT}content/images/charts/${file}?${new Date().valueOf()}`,
    };
  }
  return { file: outputpath, ...additional };
};


export default {
  DefaultBarChart: BarChart,
};
