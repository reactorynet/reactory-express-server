# Reactory Core
The Reactory Core Module is a collection of reusable building blocks that are used to build applications on the Reactory platform. The module is designed to provide a set of core functionalities that are essential to most applications, such as resolvers, types, directives, workflows, forms, and services.


# Workflows
The core module ships with a CleanCache workflow which is a basic workflow that executes periodically to expunge data from the built in cache.

# Forms
The Reactory Core Module provides a set of pre-built forms that can be used to collect and validate user input. These forms are customizable and can be extended to meet the needs of specific applications, however it is suggested that customizations are made in your own custom modules.

### Services
The module provides a set of core services that can be used to interact with external systems and APIs. These services provide a consistent API for accessing and manipulating data in external systems.

* GoogleMapsService
* Processors (ETL processor experimental)
* EmailService can send mail via sendgrid or using MS api.
* TemplateService
* FileService
* ReactoryExcelWriterServiceDefinition
* OrganizationServiceDefinition
* ReactoryPackageManager (ETL package manager - experimental)
* UserService
* WorkflowService
* FetchService
* PdfService
* ReactorySupportService
* SystemService
* ReactoryFormService
* ReactoryModuleCompilerService
* ReactoryTranslationService


# Translations
Current translations is working via i18n translations. Translation files are loaded from the CDN.

The translation service is a work in progress to enhance the features provided by i18n. Allow for user defined translations or provide different translations depending on the execution context of the user.
