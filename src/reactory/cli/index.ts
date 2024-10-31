import cli from './cli';

// Execute the main function.
// TODO: this needs to change once compiled and the additional args 
// from babel is removed.
cli(process.argv.slice(2));