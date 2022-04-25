const startServer = require("verdaccio").default;

let config = {
  storage: "./storage",
  auth: {
    htpasswd: {
      file: "./htpasswd"
    }
  },
  uplinks: {
    npmjs: {
      url: "https://registry.npmjs.org/",
    }
  },
  self_path: "./",
  packages: {
    "@*/*": {
      access: "$all",
      publish: "$authenticated",
      proxy: "npmjs",
    },
    "**": {
      proxy: "npmjs"
    }
  },
  log: {
    type: "stdout",
    format: "pretty",
    level: "http",
  }
};

export default () => startServer(
  config,
  8080,
  undefined,
  "1.0.0",
  "verdaccio",
  (webServer, addrs) => {
    webServer.listen(
      addrs.port || addrs.path,
      addrs.host,
      () => {
        console.log(`verdaccio running on : ${addrs.host}:${addrs.port}`);
      }
    );
  }
);
