const uuidv4 = require(`uuid/v4`);
const gatsbyConfig = require(`../../../gatsby-config`);
const {plugins} = gatsbyConfig;
let PLUGIN_OPTIONS = plugins.find(plugin => plugin.resolve === 'gatsby-build-newrelic').options;

const {staging} = PLUGIN_OPTIONS;
const euAccount = PLUGIN_OPTIONS.NR_LICENSE_KEY.startsWith('eu');
let BENCHMARK_REPORTING_URL = 'https://metric-api.newrelic.com/metric/v1'

PLUGIN_OPTIONS.buildId = process.gatsbyTelemetrySessionId || uuidv4();
PLUGIN_OPTIONS.euAccount = euAccount;

if (staging) {
  BENCHMARK_REPORTING_URL = 'https://staging-metric-api.newrelic.com/metric/v1'
} else if (euAccount) {
  BENCHMARK_REPORTING_URL = 'https://metric-api.eu.newrelic.com/metric/v1'
}

module.exports = {
  PLUGIN_OPTIONS,
  BENCHMARK_REPORTING_URL,
}
