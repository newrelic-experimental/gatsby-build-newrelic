  // You can use string format or `process.env` if you'd prefer
const uuidv4 = require(`uuid/v4`);
const pluginOptions = require(`../../../gatsby-config`);
const ci = require('ci-info');

let THEME_OPTIONS = pluginOptions.plugins.filter(plugin => plugin.resolve === 'gatsby-plugin-newrelic-test')[0].options;
THEME_OPTIONS.buildId = process.gatsbyTelemetrySessionId || uuidv4(); 
if (THEME_OPTIONS.logs === undefined){
  THEME_OPTIONS.logs = {
    collectLogs: true,
  };
}
if (THEME_OPTIONS.traces === undefined){
  THEME_OPTIONS.traces = {
    collectTraces: true,
  };
}
if (THEME_OPTIONS.metrics === undefined){
  THEME_OPTIONS.metrics = {
    collectMetrics: true,
  };
}
const CI_NAME = ci.name || 'local';
const BENCHMARK_REPORTING_URL = `https://${THEME_OPTIONS.staging && `staging-`}metric-api.newrelic.com/metric/v1`;
module.exports = {
  THEME_OPTIONS,
  CI_NAME,
  BENCHMARK_REPORTING_URL,
}
  