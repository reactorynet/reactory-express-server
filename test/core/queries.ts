export const apiStatusQuery = `
query status {
    id
    apiStatus {
    applicationName
    applicationAvatar
    when
    status
    firstName
    lastName
    email
    avatar
    roles
    organization {
      id
      name
      logo
    }
    businessUnit {
      id
      name
      avatar
    }
    memberships {
      client {
        id          
        name
      }
      organization {
        id
        name
        logo
      }
      businessUnit {
        id
        name
        avatar
      }
      roles
    }
    id
    theme
    themeOptions
    colorSchemes
    routes {
      id
      path
      public
      roles
      componentFqn
      exact
      args {
        key
        value
      }
      component {
        nameSpace
        name
        version
        args {
          key
          value
        }
        title
        description
        roles
      }
    }
    menus {
      id
      key
      name
      target
      roles
      entries {
        id
        ordinal
        title
        link
        external
        icon
        roles
        items {
          id
          ordinal
          title
          link
          external
          icon
          roles            
        }
      }
      
    }     
    messages {
      id
      title
      text
      data
      via
      icon
      image
      requireInteraction
      silent
      timestamp
      actions {
        id
        action
        icon
        componentFqn
        componentProps
        modal
        modalSize
        priority
      }
    }
    navigationComponents {				
      componentFqn
      componentProps
      componentPropertyMap
      componentKey
      componentContext
    }
  }
}`;


export default {
  apiStatusQuery
}