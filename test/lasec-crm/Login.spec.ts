import env from '../env';
import { Done, Context } from 'mocha';

import {
  Builder, By, Key, until,
  WebDriver, Session, WebElementCondition
} from 'selenium-webdriver';

//do not use import with BTOA as it does not exports the default function
const btoa = require('btoa');
const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN,
  REACTORY_CLIENT_URL,
} = env;




const FrontPageLoadTestWithOffice365Login: Mocha.Func = async function() {
  const self: Context = this;
  self.timeout(20000);
    
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await driver.get(REACTORY_CLIENT_URL);
    await driver.findElement(By.id('reactory-security::office-365-login-button')).click();        
    return driver.quit();           
  }
  catch(driverError){
    //done(driverError)
    throw driverError
  }        
}

const FrontPageLoadTestWithOfficeAltLogin: Mocha.Func = async function() {
  const self: Context = this;
  self.timeout(20000);    
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await driver.get(`${REACTORY_CLIENT_URL}/login_alt`);
    
    let loginButton = driver.findElement(By.id('reactory-security::standard-login-button'));
    let username = driver.findElement(By.id('reactory-security::standard-login-email'));
    let password = driver.findElement(By.id('reactory-security::standard-login-password'));

    await username.sendKeys(REACTORY_TEST_USER);
    await password.sendKeys(REACTORY_TEST_USER_PWD);

    await loginButton.click();

    return driver.quit();           
  }
  catch(driverError){
    //done(driverError)
    throw driverError
  }        
}



describe('Lasec Login UX Spec', () => {    
  it('Should load the front page with a MS Login Button', FrontPageLoadTestWithOffice365Login);
  it('Should load the front page with a the alt login configuration', FrontPageLoadTestWithOfficeAltLogin);  
});
