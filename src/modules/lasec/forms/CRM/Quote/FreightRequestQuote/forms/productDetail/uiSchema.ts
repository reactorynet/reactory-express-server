
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
            productDetails: { xs: 12, sm: 12, md: 12, lg: 12, },
        },
    ],
    productDetails: {
        'ui:widget': 'ProductDetailWidget',
        'ui:options': {
            props: {},
            componentPropsMap: {
                'formContext.$formData.productDetails': 'formData.productDetails',
                'formData': 'formData.productDetails',
            },
        }
    }
};
