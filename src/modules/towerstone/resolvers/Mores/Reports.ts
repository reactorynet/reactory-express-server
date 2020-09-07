
import { MoresIndidvidual360DataResolver } from '../../pdf/Mores/Individual360'

const ReportsResolver = {
    Query: {
        MoresIndividual360ReportData: (obj, params) => {
            return MoresIndidvidual360DataResolver(params);
        }
    }
}

export default ReportsResolver