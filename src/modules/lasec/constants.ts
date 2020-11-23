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

const statusGroupName: any = {
  "1": "Draft",
  "2": "Open",
  "3": "Accepted",
  "4": "Lost",
  "5": "Expired",
  "6": "Deleted",
};

export const LOOKUPS = {
  statusGroupName
};

export const OBJECT_MAPS = {
  meta: {
    "id": ["code", "meta.reference"],
    "created": "created",
    "modified": "modified",
    "note": "note",
  },
  customer: {
    //"customer_id": ["customer.meta.reference", "id"],
    //"customer_full_name": "customer.fullName"
  },
  staff: {
    "primary_api_staff_user_id": ["salesRep.meta.reference"],
    "sales_team_id": "salesTeam.meta.reference",
    "staff_user_full_name": "salesRep.fullName"
  },
  company: {
    //"company_id": "company.meta.reference",
    //"company_trading_name": ["company.tradingName", "company.name"]
  },
  status: {
    "status_id": "status",
    "substatus_id": ["statusGroup", {
      key: "statusGroupName", transform: (substatus_id: string) => {
        return LOOKUPS.statusGroupName[`${substatus_id}`];
      }
    }],
    "status_name": "statusName",
  },
  totals: {
    "grand_total_excl_vat_cents": ["totalVATExclusive", "totals.totalVATExclusive"],
    "grand_total_vat_cents": ["totalVAT", "totals.totalVAT"],
    "grand_total_incl_vat_cents": ["totalVATInclusive", "totals.totalVATInclusive"],
    "grand_total_discount_cents": ["totalDiscount", "totals.totalDiscount"],
    "grand_total_discount_percent": ["totalDiscountPercent", "totals.totalDiscountPercent"],
    "gp_percent": ["GP", "totals.GP"],
    "actual_gp_percent": ["actualGP", "totals.actualGP"],
  },
}





export default {
  DefaultLasecCompanyMap,
  GetCompanyWithId,
  LOOKUPS,
}