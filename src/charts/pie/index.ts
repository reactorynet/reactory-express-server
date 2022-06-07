


import path from 'path';
import fs from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '../../logging';



const defaultOptions = {
  cutoutPercentage: 50,
};

export const DefaultPieChart = async (props: Reactory.IChartProps): Promise<Reactory.IChartResult> => {

  const {
    folder,
    file,
    width,
    height,
    resolveCDN = false,
    data,
    options,
    mime = 'image/png',
    context
  } = props;

  const defaultData = () => ({
    datasets: [{
      data: [82, 18],
    }],

    // These labels appear in the legend and in the tooltips when hovering different arcs
    labels: [
      'Avg Score',
    ],

    backgroundColor: [
      `${context.partner.themeOptions.palette.primary.main}`,
      'rgba(0,0,0,0)',
    ],
  });

  const outputpath: fs.PathLike = path.join(folder, file);
  const chartNode = new ChartJSNodeCanvas({
    height: height || 400,
    width: width || 400,
    type: 'pdf',
  });

  const stream = chartNode.renderToStream({
    type: 'pie',
    data: data || defaultData(),
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
  DefaultPieChart,
};
