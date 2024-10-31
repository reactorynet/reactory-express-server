# Google OAUTH2 in Reactory
The google oauth flow uses the `passport-google-oauth20` npm package for handling the strategy.

## Overview
The process can broadly be described by the flow below.
```mermaid
graph TD
    A[User] -->|Initiates Login| B[Reactory Client]
    B -->|Redirect to Google OAuth| C[Google OAuth Server]
    C -->|User Grants Permission| D[Google OAuth Server]
    D -->|Redirect with Auth Code| E[Reactory Callback Endpoint]
    E -->|Exchange Auth Code for Token| F[Google Token Endpoint]
    F -->|Return Access Token| G[Reactory Server]
    G -->|Request User Info| H[Google UserInfo Endpoint]
    H -->|Return User Info| I[Reactory Server]
    I -->|Find/Create User| J[Reactory Mongo Database]
    J -->|Return User Data| K[Reactory Server]
    K -->|Generate Login Token| L[Reactory Server]
    L -->|Set Session and Redirect| A[User - Reactory Client]

    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#333,stroke-width:4px
    style C fill:#f96,stroke:#333,stroke-width:4px
    style D fill:#f96,stroke:#333,stroke-width:4px
    style E fill:#bbf,stroke:#333,stroke-width:4px
    style F fill:#f96,stroke:#333,stroke-width:4px
    style G fill:#bbf,stroke:#333,stroke-width:4px
    style H fill:#f96,stroke:#333,stroke-width:4px
    style I fill:#bbf,stroke:#333,stroke-width:4px
    style J fill:#6f6,stroke:#333,stroke-width:4px
    style K fill:#bbf,stroke:#333,stroke-width:4px
    style L fill:#bbf,stroke:#333,stroke-width:4px
```

For an in-depth understanding of the oauth2 flow, see the article written [here](https://www.passportjs.org/concepts/oauth2/).

## Configuration
There are a few setings that you have to supply for each client / tenant app.

Set the below environment variables for your application, either via the .env configuration file for your environment or any other environment management process.

```typescript
const { 
  GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET',
  GOOLGE_CALLBACK_URL = 'http://localhost:4000/auth/google/callback',
  GOOGLE_OAUTH_SCOPE = 'openid email profile https://www.googleapis.com/auth/userinfo.profile',
} = process.env

```

## Testing
Due to the nature of the oauth flow test, minimal unit tests are added to ensure reactory platform handles redirects correctly across state.

Tests can be executed with `bin/jest.sh reactory local GoogleStrategy`
