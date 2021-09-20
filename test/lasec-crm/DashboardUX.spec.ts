
import env from '../env';
import { Done, Context } from 'mocha';

import {
  Builder, By, Key, until,
  WebDriver, Session, WebElementCondition, ThenableWebDriver
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

const DashboardLoadTestWithOfficeAltLogin: Mocha.Func = async function() {
  const self: Context = this;
  self.timeout(20000);    
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    await driver.get(`${REACTORY_CLIENT_URL}/login_alt`);
    
    let loginButton = driver.findElement(By.id('reactory-security::standard-login-button'));
    let username = driver.findElement(By.id('reactory-security::standard-login-email'));
    let password = driver.findElement(By.id('reactory-security::standard-login-password'));

    const dashboardElement = driver.findElement(By.id('CrmDashboard'));

    await username.sendKeys(REACTORY_TEST_USER);
    await password.sendKeys(REACTORY_TEST_USER_PWD);

    await loginButton.click();    
    
    await driver.wait( until.elementIsVisible(dashboardElement), 10000, 'CrmDashboardForm element not available')    
    await driver.findElement(By.id('mui-component-select-agentSelection')).click();
    await driver.findElement(By.css('li[data-value="team"]')).click()
    await driver.findElement(By.css('input[placeholder="Rep Code Selection"]')).click()

    return driver.quit();           
  }
  catch(driverError){
    //done(driverError)
    throw driverError
  }        
}


describe(`Lasec Sales Dashboard Spec`, ()=>{
  let driver: any = null;

  before('Configure the web driver and login the user', async function(){
    const self: Context = this;
    self.timeout(20000);    
    
    driver = await new Builder().forBrowser('chrome').build();

    await driver.get(`${REACTORY_CLIENT_URL}/login_alt`);
      
    let loginButton = driver.findElement(By.id('reactory-security::standard-login-button'));
    let username = driver.findElement(By.id('reactory-security::standard-login-email'));
    let password = driver.findElement(By.id('reactory-security::standard-login-password'));

    await username.sendKeys(REACTORY_TEST_USER);
    await password.sendKeys(REACTORY_TEST_USER_PWD);

    await loginButton.click();   
    await driver.wait( until.elementIsNotVisible(loginButton))

  });


  it('Should load the login page, log in the user and display the sales dashboard', async function() {
    const self: Context = this;
    self.timeout(20000);
    try {       

      const dashboardElement = driver.findElement(By.id('CrmDashboard'));
      
      
      await driver.wait( until.elementIsVisible(dashboardElement), 20000, 'CrmDashboardForm element not available')    
      await driver.findElement(By.id('mui-component-select-agentSelection')).click();
      await driver.findElement(By.css('li[data-value="team"]')).click()
      await driver.findElement(By.css('input[placeholder="Rep Code Selection"]')).click()
  
      return driver.quit();           
    }
    catch(driverError){
      //done(driverError)
      throw driverError
    }        
  })
})