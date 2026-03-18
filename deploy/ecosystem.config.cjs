module.exports = {
  apps: [
    {
      name: "evcapture",
      script: ".next/standalone/server.js",
      cwd: "/var/www/evcapture/current",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
