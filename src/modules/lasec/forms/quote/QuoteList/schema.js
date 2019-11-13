import { cloneDeep } from 'lodash';
import { default as DashboardSchema } from '../../salesDashboard/schema';

const $schema = cloneDeep(DashboardSchema);

delete $schema.properties.charts;
delete $schema.properties.totalBad;
delete $schema.properties.statusSummary;
delete $schema.properties.totalBad;
delete $schema.properties.combinedData;

export default $schema;
