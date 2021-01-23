import { Reactory } from "@reactory/server-core/types/reactory";

interface IUIDropDownItemSchema {
  key: string,
  value: string,
  label: string,
  icon?: string,
  iconProps?: any
}

interface IUIDropDownUIOptions extends Object {
  FormControl: any,
  labelStyle?: any,
  selectProps?: any,
  selectOptions: IUIDropDownItemSchema[]
}
interface IUIDropDownSchema extends Reactory.IUISchema {
  'ui:widget': 'SelectWidget',
  'ui:options': IUIDropDownUIOptions
};

export const AccountTypeDropdownUISchema: IUIDropDownSchema = {
  'ui:widget': 'SelectWidget',
  'ui:options': {
    FormControl: {
      props: {
        style: {
          maxWidth: '400px'
        }
      }
    },    
    selectOptions: [
      {
        key: 'account',
        value: 'account',
        label: 'Account',
        icon: 'account_balance_wallet',
        iconProps: {
          style: {
            color: '#FF9901',
            margin: '-6px',
            marginRight: '8px',
          },
        }
      },
      {
        key: 'cod',
        value: 'cod',
        label: 'Pre-Paid',
        icon: 'attach_money',
        iconProps: {
          style: {
            color: '#5EB848',
            margin: '-6px',
            marginRight: '8px',
          },
        }
      },
    ],
  }
}
