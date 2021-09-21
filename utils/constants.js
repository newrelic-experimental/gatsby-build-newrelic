const uuidv4 = require(`uuid/v4`);
const pluginOptions = require(`../../../gatsby-config`);
const {plugins} = pluginOptions;
let PLUGIN_OPTIONS = plugins.find(plugin => plugin.resolve === 'gatsby-build-newrelic').options;
PLUGIN_OPTIONS.buildId = process.gatsbyTelemetrySessionId || uuidv4();
const BENCHMARK_REPORTING_URL = `https://${PLUGIN_OPTIONS.staging ? `staging-` : ``}metric-api.newrelic.com/metric/v1`;
module.exports = {
  PLUGIN_OPTIONS,
  BENCHMARK_REPORTING_URL,
}
