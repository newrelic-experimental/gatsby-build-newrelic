// You can use string format or `process.env` if you'd prefer
const uuidv4 = require(`uuid/v4`);
const pluginOptions = require(`../../../gatsby-config`);
const ci = require('ci-info');
const {plugins} = pluginOptions;
let PLUGIN_OPTIONS = plugins.find(plugin => plugin.resolve === 'gatsby-plugin-newrelic-test').options;
PLUGIN_OPTIONS.buildId = process.gatsbyTelemetrySessionId || uuidv4();
const CI_NAME = ci.name || 'local';
const BENCHMARK_REPORTING_URL = `https://${PLUGIN_OPTIONS.staging ? `staging-` : ``}metric-api.newrelic.com/metric/v1`;
module.exports = {
  PLUGIN_OPTIONS,
  CI_NAME,
  BENCHMARK_REPORTING_URL,
}
  