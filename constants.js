  // You can use string format or `process.env` if you'd prefer
  const uuidv4 = require(`uuid/v4`);
  module.exports = {
    buildId: process.gatsbyTelemetrySessionId || uuidv4(),
  }
  