  // You can use string format or `process.env` if you'd prefer
  module.exports = {
    NR_KEY: process.env.NEW_RELIC_INSERT_KEY || '',
    NR_LICENSE: process.env.NEW_RELIC_LICENSE_KEY || '',
    SITE_NAME: process.env.SITE_NAME || '',
    traces: {
      collectTraces: true,
      tags:{
        'tracetest': 'gatsby',
      }
    },
    logs: {
      collectLogs: true,
      tags: {
        'logtest': 'gatsby',
      }
    },
    metrics: {
      collectMetrics: true,
      tags: {
        'metrictest': 'gatsby',
      }
    },
    nrAgent: {
      collectApm: true,
    },
  }
  