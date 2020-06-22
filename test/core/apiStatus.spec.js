const chai = require('chai');
const env = require('../env');
const btoa = require('btoa');
const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN
} = env;


const request = require('supertest')(API_URI_ROOT);
const $api = () => {
  return request.post('/api')
  .set('Accept', 'application/json')
  .set('x-client-key', REACTORY_CLIENT_KEY)
  .set('x-client-pwd', REACTORY_CLIENT_PWD);
};

const apiStatusQuery = `
query status {
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

describe('Reactory API', () => {  
  it('Should return an unauthorized access status code', (done) => {
    request.post('/api')
    .set('Accept', 'application/json')
    .send({ query: apiStatusQuery })
    .expect(401)
      .end((err, res) => {        
        if(err) done(err);                
        else done();
      });
  });

  it('Should return an anonymous user access status', (done) => {
    request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${REACTORY_ANON_TOKEN}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err, res) => {        
              if(err) done(err);                
              else done();
            });
  });
  
  it('It should respond with a 401 unauthorized', (done) => {
    let token = btoa('bogus.user@bogusmail.com:boguspasswordfordays');
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(401)
      .end((err, res) => {        
        if(err) done(err);
        else done();
      });
  });

  it(`It should respond with an API Status for ${REACTORY_TEST_USER} ${REACTORY_TEST_USER_PWD}`, (done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err, res) => {
        if(err) done (err);
        else {        
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${res.body.user.token}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err, res) => {        
              if(err) done(err);                
              else done();
            });
        }        
      });
  });
  

});