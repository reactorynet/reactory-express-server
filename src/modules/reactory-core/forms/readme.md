# Forms in Reactory Core Module
The forms in this module are a collection that demonstrate various ways to use the forms engine. Some of these forms are simple and defined as constants in the shared.ts file, while others are more complex and provide advanced use cases.

Examples of the latest features of the forms engine can be found in the Applications form and the Support forms. Also see the `Global` form for how to create non visible form that install dependencies into the application as soon as it is mounted.

The templates folder contains a skeleton for creating a new server-side form. You can use this skeleton to create custom forms that suit your needs.

It is recommended that most of your form definitions be served from the backend. This allows for immediate changes to the forms without requiring plugin deployment.

Only custom components that are complex and have large feature sets should be built as separate client plugins.

The server also supports delivering UX and client-side execution modules by compiling resources and publishing them to the CDN plugin location.