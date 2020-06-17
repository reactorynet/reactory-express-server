export enum ReactoryChartType {
  FUNNEL,
  PIE,
  AREA,
  LINE,
  RADAR,
  RADIAL,
  SCATTER,
  TREEMAP,
  COMPOSED,
}

export interface ReactoryChart {
  chartType: string | ReactoryChartType
  data: any,
  options: any,
  key?: string
}