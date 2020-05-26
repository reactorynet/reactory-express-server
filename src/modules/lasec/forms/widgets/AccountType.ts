import { Reactory } from "types/reactory";

interface IUIDropDownSchema extends Reactory.IUISchema {

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