# Reactory Core
The Reactory Core Module is a collection of reusable building blocks that are used to build applications on the Reactory platform. The module is designed to provide a set of core functionalities that are essential to most applications, such as resolvers, types, directives, workflows, forms, and services.


# Workflows
The core module ships with a CleanCache workflow which is a basic workflow that executes periodically to expunge data from the built in cache.

# Forms
The Reactory Core Module provides a set of pre-built forms that can be used to collect and validate user input. These forms are customizable and can be extended to meet the needs of specific applications, however it is suggested that customizations are made in your own custom modules.

### Services
The module provides a set of core services that can be used to interact with external systems and APIs. These services provide a consistent API for accessing and manipulating data in external systems. Below is a service list. (Check the services folder in this module, the list below is not complete.)

* GoogleMapsService - lightweight location search service.
* ETL Processors (ETL processor experimental - these are used to import users and demographics)
* EmailService can send mail via sendgrid. Will be updated to send via different service providers.
* TemplateService - the template service provides the means to manage native reactory templates.
* FileService - A file system services that allows reactory to write to the reactory data storage folders
* OrganizationService - An organisation service provides the means to manage organisations in a manner that relates to the system usage.
* ReactoryPackageManager (ETL package manager - experimental)
* UserService - A service for user management functions
* WorkflowService - A service that provides workflow management functions
* FetchService - A fetch services that abtstract url calls and provides functionality to add user credentials for the logged in user.
* PdfService - A service used to render PDFs, allows for piping over the stream or creating a PDF and storing in file
* ReactorySupportService - A basic support management tool that allows tracking of requests specific to the application. The support services are used generally as illustration how to build according to the convention, configuration and customization way of thinking.
* SystemService - Self explanatory
* ReactoryFormService - Provides functionality to manage forms.
* ReactoryModuleCompilerService - Module compiler service used for runtime compilations 
* ReactoryTranslationService - Provides translation management capability


# Translations
Current translations is working via i18n translations. Translation files are loaded from the CDN. Translation services updates are in progress that will allow runtime management of translation file via database augmentation.

The translation service is a work in progress to enhance the features provided by i18n. Allow for user defined translations or provide different translations depending on the execution context of the user.
