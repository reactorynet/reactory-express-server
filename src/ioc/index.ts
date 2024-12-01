// file inversify.config.ts
// NOTE: This file is used to create a container for the inversify library
// The intention here is to migrate provide an alternative means of
// dependency injection in the project.
import { Container } from "inversify";
const ReactoryContainer = new Container();
export { ReactoryContainer };
