'use strict';
var nr = require('newrelic')
const fs = require('fs');
const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

exports.__esModule = true;
exports.stop = exports.create = void 0;

const _zipkin = _interopRequireDefault(require('zipkin'));

const _zipkinTransportHttp = require('zipkin-transport-newrelic');

const _zipkinJavascriptOpentracing = _interopRequireDefault(
  require('zipkin-javascript-opentracing')
);
const constants = require('./constants');
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
    endpoint: `https://trace-api.newrelic.com/trace/v1`,
    headers: {
      'Api-Key': constants.NR_KEY,
      'Data-Format': 'zipkin',
      'Data-Format-Version': 2,
    },
  });
  recorder = new _zipkin.BatchRecorder({
    logger,
    // timeout = 60 hours, must be longer than site's build time
    timeout: 60 * 60 * 60 * 1000000,
  });
  // console.log(recorder)
  const tracer = new _zipkinJavascriptOpentracing.default({
    localServiceName: constants.SITE_NAME,
    serviceName: constants.SITE_NAME,
    // Sample 1 out of 1 spans (100%). When tracing production
    // services, it is normal to sample 1 out of 10 requests so that
    // tracing information doesn't impact site performance. But Gatsby
    // is a build tool and only has "1" request (the
    // build). Therefore, we must set this to 100% so that spans
    // aren't missing
    sampler: new _zipkin.sampler.CountingSampler(1),
    traceId128Bit: true,
    recorder,
    kind: `client`,
  });
  return tracer;
}; // Workaround for issue in Zipkin HTTP Logger where Spans are not
// cleared off their processing queue before the node.js process
// exits. Code is mostly the same as the zipkin processQueue
// implementation.

exports.create = create;

const _processQueue = async () => {
  if (!constants.traces.collectTraces) {
    return
  }
  console.log('[@] Starting Zipkin Tracing')
  if (logger.queue.length > 0) {
    const formattedQueue = logger.queue.map((trace) => {
      const formatTrace = JSON.parse(trace)
      // formatTrace.gatsbySite = constants ? constants.SITE_NAME : 'gatsby-site'

      formatTrace.localEndpoint = {}
      formatTrace.localEndpoint.serviceName = constants.SITE_NAME
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
      const {tags} = constants.traces;
      for (let tag in tags) {
        formatTrace.tags[tag] = tags[tag]
      }
      return JSON.stringify({...formatTrace,...constants.traces.tags})
    })

    const postBody = `[${formattedQueue.join(',')}]`
    
    try {
      const response = await (0, _nodeFetch.default)(logger.endpoint, {
        method: `POST`,
        body: postBody,
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': constants.NR_KEY,
          'Data-Format': 'zipkin',
          'Data-Format-Version': 2,
        },
      });

      if (response.status !== 202) {
        const err =
          `Unexpected response while sending Zipkin data, status:` +
          `${response.status}, body: ${postBody}`;
        if (logger.errorListenerSet) logger.emit(`error`, new Error(err));
        else console.error(err);
      }
    } catch (error) {
      const err = `Error sending Zipkin data ${error}`;
      if (logger.errorListenerSet) logger.emit(`error`, new Error(err));
      console.error(err);
    }
  }
};
/**
 * Run any tracer cleanup required before the node.js process
 * exits. For Zipkin HTTP, we must manually process any spans still on
 * the queue
 */

const stop = async () => {
  // First, write all partial spans to the http logger
  // recorder.partialSpans.forEach((span, id) => {
  //   console.log(recorder)
  //   if (recorder._timedOut(span)) {
  //     recorder._writeSpan(id);
  //   }
  // }); // Then tell http logger to process all spans in its queue

  await _processQueue();
};

exports.stop = stop;
// # sourceMappingURL=zipkin-local.js.map
