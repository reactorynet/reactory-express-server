

export const coverPage = (data: any) => {

    let reportTitle = '';

    if (!data) return [{ text: 'No Data'} ];
    if (!data.survey) return [{ text: '"survey" property missing on data' }]
    
    switch (data.survey.surveyType) {
        case 'l360': {
            reportTitle = 'Leadership 360° Assessment Report';
            break;
        }
        case 'i360': {
            reportTitle = 'Individual 360° Assessment Report';
            break;
        }
        case 'team180': {
            reportTitle = 'Team 180° Assessment Report';
            break;
        }
        case 'culture': {
            reportTitle = 'Team Culture Assessment Report';
            break;
        }
    }

    return [
        {
            image: 'partnerLogo', width: 215, style: ['centerAligned'], margin: [0, 0, 0, 0]
        },
        { text: reportTitle, style: ['title', 'centerAligned'], margin: [0, 18, 0, 20] },
        {
            text: `${data.delegate.firstName} ${data.delegate.lastName}`,
            style: ['header', 'centerAligned', 'secondary'],
            margin: [0, 0]
        },
        { text: `${data.organization.name}`, style: ['header', 'centerAligned', 'secondary'], margin: [0, 30, 0, 0] },
        { text: `${moment().format('MMMM YYYY')}`, style: ['header', 'centerAligned', 'secondary', 'subheader2'], margin: [0, 15, 0, 320] },
        { text: 'In association with', style: ['default', 'centerAligned'], margin: [0, 0, 0, 20] },
        {
            image: 'towerstoneLogoGreyScale', width: 180, style: ['centerAligned'],
        },
        { text: 'Table of Contents', style: ['subheader', 'primary'], pageBreak: 'before' },
        {
            toc: {
                numberStyle: { bold: true }
            }
        },
    ];

} 