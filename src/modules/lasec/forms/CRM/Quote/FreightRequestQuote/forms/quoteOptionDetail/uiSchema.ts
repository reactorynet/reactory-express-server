
export const uiSchema: any = {
    'ui:options': {
        toolbarPosition: 'none',
        componentType: "div",
        container: "div",
        showSubmit: false,
        showRefresh: false,
        containerStyles: {
            padding: '0px',
            marginTop: '16px',
            boxShadow: 'none'
        },
        style: {
            marginTop: '16px',
            boxShadow: 'none'
        }
    },
    'ui:titleStyle': {
        borderBottom: '2px solid #D5D5D5',
        marginBottom: '1.5rem',
        paddingBottom: '0.3rem'
    },
    'ui:field': 'GridLayout',
    'ui:grid-options': {
        container: 'div',
        containerStyle: {}
    },
    'ui:grid-layout': [
        {
            // id: { md: 6, xs: 12 },
            transportMode: { sm: 6, xs: 12 },
            incoTerm: { sm: 6, xs: 12 },
            namedPlace: { sm: 6, xs: 12 },
            vatExempt: { sm: 6, xs: 12 },
            fromSA: { sm: 6, xs: 12 },
            totalValue: { sm: 6, xs: 12 },
        },
    ],
    id: {},
    transportMode: {
        'ui:widget': 'SelectWidget',
        'ui:options': {
            renderAsOptions: true,
            selectOptions: [
                { key: 'road', value: 'road', label: 'Road' },
                { key: 'rail', value: 'rail', label: 'Rail' },
                { key: 'air', value: 'air', label: 'Air' },
            ],
        },
    },
    incoTerm: {
        'ui:widget': 'SelectWithDataWidget',
        'ui:description': "Select the client title",
        'ui:options': {
            multiSelect: false,
            query: `query LasecGetPersonTitles {
                LasecGetPersonTitles {
                    id
                    title
                }
            }`,
            resultItem: 'LasecGetPersonTitles',
            resultsMap: {
                'LasecGetPersonTitles.[].id': ['[].key', '[].value'],
                'LasecGetPersonTitles.[].title': '[].label',
            },
            selectProps: {
                style: {
                    marginTop: '1.3rem',

                }
            },
            labelStyle: {
                transform: 'none',
                fontWeight: 'bold',
                color: '#000000',
                backgroundColor: 'transparent',
                padding: 0
            }
        },
    },
    namedPlace: {},
    vatExempt: {},
    fromSA: {},
    totalValue: {
        'ui:widget': 'StyledCurrencyLabel',
        'ui:options': {
            inlineLabel: false,
            label: "Total Value:"
        },
    },
};