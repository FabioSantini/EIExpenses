module.exports = {
  apps: [
    {
      name: "ei-expenses",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 8080,
      },
      instances: 1,
      exec_mode: "fork",
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};