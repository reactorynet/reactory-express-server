import crypto from 'crypto';
import Hash from './hash';

export const strongRandom = (size: number = 32, encoding = 'base64') => 
  crypto.randomBytes(size).toString(encoding);

export const scrubEmail = (email: string) => {
  if(email === null || email === undefined) return `anonymous@${process.env.DEFAULT_DOMAIN}`;
  const [name, domain] = email.split('@');
  const scrubbedName = name.slice(0, 2) + '*'.repeat(name.length - 2);  
  return `${scrubbedName}@${domain}`;
}

export const FQN2ID = (fqn: string, errorOnNull?: boolean): number => {
  if(errorOnNull === true && (fqn === null || fqn === undefined)) throw new Error('FQN cannot be null or undefined');  
  if(fqn === null || fqn === undefined) return Hash('');
  return Hash(fqn);
}

export const ComponentFQN = (component: Partial<Reactory.IReactoryComponentDefinition>): string => { 
  if(component === null || component === undefined) throw new Error('Component cannot be null or undefined');  
  if(component.nameSpace === null || component.nameSpace === undefined) throw new Error(`Component nameSpace cannot be null or undefined: \n ${JSON.stringify(component, null, 2)}'}`);
  if(component.name === null || component.name === undefined) throw new Error('Component name cannot be null or undefined');
  

  return `${component.nameSpace}.${component.name}@${component.version || '1.0.0'}`;
}
