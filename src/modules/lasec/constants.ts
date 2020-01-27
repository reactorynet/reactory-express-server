import { find } from 'lodash';

export interface LasecCompany {
  sysproCompany: string,
  title?: string,
  companyId: number,
  defaultCurrency: string
}


export interface LasecCompanyMap {
  [key: string]: LasecCompany,
}

const DefaultLasecCompanyMap : LasecCompanyMap = {
  LasecSA: {
    sysproCompany: 'SysProCompany2',
    title: 'Lasec SA',
    companyId: 2,
    defaultCurrency: 'ZAR',
  },
  LasecInternational: {
    sysproCompany: 'SysProCompany4',
    companyId: 4,
    title: 'Lasec International',
    defaultCurrency: 'USD',
  },
  LasecEducation: {
    sysproCompany: 'SysProCompany5',
    title: 'Lasec Education',
    companyId: 5,
    defaultCurrency: 'ZAR',    
  }
};

const GetCompanyWithId = (id: number = 2) => {
  switch(id) {    
    case 4: return DefaultLasecCompanyMap["LasecInternational"]
    case 5: return DefaultLasecCompanyMap["LasecEducation"]
    case 2: 
    default:
    return DefaultLasecCompanyMap["LasecSA"]
  }
};

export default {
  DefaultLasecCompanyMap,
  GetCompanyWithId
}