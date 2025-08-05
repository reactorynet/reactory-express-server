# Copilot Instructions for Reactory Express Server

## Project Overview

This project is a Node.js Express server. For the Reactory Platform Backend. It uses TypeScript, follows modular architecture, and includes middleware, controllers, services, and models. The codebase is organized for scalability and maintainability.
The codebase has older code patterns that need to be updated to modern standards, including the use of TypeScript, async/await, and improved error handling.

## Coding Guidelines

- Use TypeScript for all source files.
- Follow the existing folder structure and naming conventions.
- Use ES6+ syntax and features.
- Prefer async/await for asynchronous code.
- Use dependency injection where appropriate.
- Write modular, reusable, and testable code.
- Add JSDoc comments for exported functions and classes.
- Use environment variables for configuration and secrets.
- Validate all incoming request data.
- Handle errors using custom error classes and middleware.
- Write unit and integration tests for new features.

## Express Best Practices

- Use `express.Router()` for route grouping.
- Separate route definitions, controllers, and business logic.
- Use middleware for authentication, validation, and error handling.
- Avoid business logic in route handlers; delegate to services.
- Return appropriate HTTP status codes and JSON responses.

## Security

- Never commit secrets or credentials to the repository.
- Sanitize and validate all user input.
- Use HTTPS in production.
- Implement proper authentication and authorization.

## Documentation

- Document all public APIs using OpenAPI/Swagger if possible.
- Keep README and code comments up to date.

## Copilot Usage

- Suggest code that fits the project's style and patterns.
- Prefer concise, readable, and maintainable solutions.
- When in doubt, follow the principle of least surprise.

## Reactory Design Patterns
Reactory uses a modular architecture with the following design patterns:
- **Modules**: Reactory has a `src/modules` directory where each module contains its own routes, controllers, services, models, form schemas, graph definitions, views, cli and other components. Each module holds a ReactoryModuleDefinition in the `src/modules/<module>/index.ts` that brings together all the module's components.
- **Dependency Injection**: Services and repositories are injected into controllers to promote loose coupling.
- **Middleware**: Common functionality such as authentication, logging, and error handling is implemented as middleware and lives in `src/express/middleware`. 

## Important! - Development and Testing
- Use `bin/start.sh` to start the server in development mode - do not use yarn start or npm start.
 - Use `bin/start-otel.sh` to start the server and enable OTEL telemetry.
- Use `bin/jest.sh` to run tests.
- Use `bin/cli.sh` to run Reactory CLI commands.
- Use `yarn` for all package related tasks
