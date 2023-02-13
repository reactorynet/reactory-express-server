const ReactoryDefaultLayout: Reactory.UX.IReactoryLayout = {
  name: "DefaultPageLayout",
  nameSpace: "reactory",
  version: "1.0.0",
  schema: {
    type: "object",
    properties: {
      header: {
        type: 'string',
        title: 'Content Header'
      },
      main: {
        type: 'string',
        title: 'Content Body'
      },
      footer: {
        type: 'sting',
        title: 'Content Footer'
      }
    }
  },
  uiSchema: {

  }
}

const Layouts: Reactory.UX.IReactoryLayout[] = [
  ReactoryDefaultLayout
]

export default Layouts;