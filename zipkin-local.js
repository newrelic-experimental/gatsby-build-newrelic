'use strict';
const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
const pluginOptions = require(`../../gatsby-config`)
const constants = require('./constants');
let THEME_OPTIONS = pluginOptions.plugins.filter(plugin => plugin.resolve === 'gatsby-plugin-newrelic-test')[0].options;
THEME_OPTIONS.buildId = constants.buildId;
exports.__esModule = true;
exports.stop = exports.create = void 0;

const _zipkin = _interopRequireDefault(require('zipkin'));

const _zipkinTransportHttp = require('zipkin-transport-newrelic');

const _zipkinJavascriptOpentracing = _interopRequireDefault(
  require('zipkin-javascript-opentracing')
);
const _nodeFetch = _interopRequireDefault(require('node-fetch'));
let logger;
let recorder;
/**
 * Create and return an open-tracing compatible tracer. See
 * https://github.com/opentracing/opentracing-javascript/blob/master/src/tracer.ts
 */

const create = () => {
  logger = new _zipkinTransportHttp.HttpLogger({
    // endpoint of local docker zipkin instance
    endpoint: `https://staging-trace-api.newrelic.com/trace/v1`,
    headers: {
      'Api-Key': THEME_OPTIONS.NR_KEY,
      'Data-Format': 'zipkin',
      'Data-Format-Version': 2,
      'options': THEME_OPTIONS,
      'tags': THEME_OPTIONS.traces.tags,
    },
  });
  recorder = new _zipkin.BatchRecorder({
    logger,
    // timeout = 60 hours, must be longer than site's build time
    timeout: 60 * 60 * 60 * 1000000,
  });
  // console.log(recorder)
  const tracer = new _zipkinJavascriptOpentracing.default({
    localServiceName: THEME_OPTIONS.SITE_NAME,
    serviceName: THEME_OPTIONS.SITE_NAME,
    sampler: new _zipkin.sampler.CountingSampler(1),
    traceId128Bit: true,
    recorder,
    kind: `client`,
  });
  return tracer;
};
exports.create = create;
const _processQueue = async () => {
  if (!THEME_OPTIONS.traces.collectTraces) {
    return
  }
  if (logger.queue.length > 0) {
    const formattedQueue = logger.queue.map((trace) => {
      const formatTrace = JSON.parse(trace)
      formatTrace.localEndpoint = {}
      formatTrace.localEndpoint.serviceName = THEME_OPTIONS.SITE_NAME
      formatTrace.tags = {}
      if (formatTrace.annotations) {
        delete formatTrace['annotations']
      }
      if (formatTrace.binaryAnnotations) {
        for (let anno of formatTrace.binaryAnnotations) {
          formatTrace.tags[anno.key] = anno.value
        }
        delete formatTrace['binaryAnnotations']
      }
      if (formatTrace.name === 'run-api') {
        formatTrace.name += `: ${formatTrace.tags.api}`
      }
      if (formatTrace.name === 'run-plugin') {
        formatTrace.name += `: ${formatTrace.tags.plugin}`
      }
      const {tags} = THEME_OPTIONS.traces;
      for (let tag in tags) {
        formatTrace.tags[tag] = tags[tag]
      }
      formatTrace.tags.buildId = THEME_OPTIONS.buildId;
      formatTrace.tags.gatsbySite = THEME_OPTIONS.SITE_NAME;
      return JSON.stringify({...formatTrace,...THEME_OPTIONS.traces.tags})
    })

    const postBody = `[${formattedQueue.join(',')}]`
    
    try {
      const response = await (0, _nodeFetch.default)(logger.endpoint, {
        method: `POST`,
        body: postBody,
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': THEME_OPTIONS.NR_KEY,
          'Data-Format': 'zipkin',
          'Data-Format-Version': 2,
        },
      });

      if (response.status !== 202) {
        const err =
          `gatsby-plugin-newrelic: Unexpected response while sending trace data, status:` +
          `${response.status}, body: ${postBody}`;
        if (logger.errorListenerSet) logger.emit(`error`, new Error(err));
        else console.error(err);
      }
    } catch (error) {
      const err = `gatsby-plugin-newrelic: Error sending trace data ${error}`;
      if (logger.errorListenerSet) logger.emit(`error`, new Error(err));
      console.error(err);
    }
  }
};

const stop = async () => {

  await _processQueue();
};
exports.stop = stop;