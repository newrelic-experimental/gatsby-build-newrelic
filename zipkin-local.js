const _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
const {
  PLUGIN_OPTIONS,
} = require("gatsby-build-newrelic/utils/constants");
const getCiData = require("./utils/getCiData");
const _zipkin = _interopRequireDefault(require("zipkin"));
const _zipkinTransportHttp = require("zipkin-transport-newrelic");
const _zipkinJavascriptOpentracing = _interopRequireDefault(
  require("zipkin-javascript-opentracing")
);
const _nodeFetch = _interopRequireDefault(require("node-fetch"));
const {now} = require('./utils/time');

const TIMEOUT_LENGTH = 60 * 60 * 60 * 1000000;

let recorder, 
    logger;
/**
 * Create and return an open-tracing compatible tracer. See
 * https://github.com/opentracing/opentracing-javascript/blob/master/src/tracer.ts
 */

const create = () => {
  console.log(`Gatsby ${process.env.GATSBY_CLOUD}`)
  console.log(`VERCEL ${process.env.VERCEL}`)
  console.log(`Netlify ${process.env.NETLIFY}`)
  const ciAttributes = getCiData();
  const { staging, NR_INGEST_KEY, customTags = {}, SITE_NAME } = PLUGIN_OPTIONS;
  logger = new _zipkinTransportHttp.HttpLogger({
    endpoint: `https://${
      staging ? `staging-` : ``
    }trace-api.newrelic.com/trace/v1`,
    jsonEncoder: _zipkin.jsonEncoder.JSON_V2,
    httpInterval: 100,
    headers: {
      "Api-Key": NR_INGEST_KEY,
      "Data-Format": "zipkin",
      "Data-Format-Version": 2,
      options: PLUGIN_OPTIONS,
      tags: {
        ...customTags,
        ...ciAttributes,
      },
    },
  });
  recorder = new _zipkin.BatchRecorder({
    logger,
    // timeout = 60 hours, must be longer than site's build time
    timeout: TIMEOUT_LENGTH,
  });
  const tracer = new _zipkinJavascriptOpentracing.default({
    localServiceName: SITE_NAME,
    serviceName: SITE_NAME,
    sampler: new _zipkin.sampler.CountingSampler(1),
    traceId128Bit: true,
    supportsJoin: true,
    recorder,
    kind: `client`,
  });
  return tracer;
};

const formatTrace = (trace) => {
  const { SITE_NAME, customTags = {}, buildId } = PLUGIN_OPTIONS;
  trace = JSON.parse(trace);
  trace.localEndpoint = {};
  trace.localEndpoint.serviceName = SITE_NAME;
  if(!trace.tags) {
    trace.tags = {};
  }
  if (trace.binaryAnnotations) {
    for (let anno of trace.binaryAnnotations) {
      trace.tags[anno.key] = anno.value;
    }
  }
  if (trace.name === "run-api") {
    trace.name += `: ${trace.tags.api}`;
  }
  if (trace.name === "run-plugin") {
    trace.name += `: ${trace.tags.plugin}`;
  }
  trace.tags = {...trace.tags, ...customTags};
  trace.tags.buildId = buildId;
  return JSON.stringify(trace);
}

const sendTraceQueue = async (queue) => {
  const { NR_INGEST_KEY } = PLUGIN_OPTIONS;
  const response = await (0, _nodeFetch.default)(logger.endpoint, {
    method: `POST`,
    body: queue,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": NR_INGEST_KEY,
      "Data-Format": "zipkin",
      "Data-Format-Version": 2,
    },
  });

  if (response.status >= 300) {
    const err =
      `[@] gatsby-plugin-newrelic: Unexpected response while sending trace data, status:` +
      `${response.status}`;
    if (logger.errorListenerSet) {
      logger.emit(`error`, new Error(err));
    }
    else {
      console.error(err);
    }
  }
}

const _processQueue = async () => {
  const { NR_INGEST_KEY, collectTraces = true} = PLUGIN_OPTIONS;
  if (!NR_INGEST_KEY || !collectTraces || logger.queue.length <= 0) {
    return;
  }
  try {
    const formattedQueue = logger.queue.map(formatTrace);
    const postBody = `[${formattedQueue.join(",")}]`;
    await sendTraceQueue(postBody);
  } catch (error) {
    const err = `[@] gatsby-plugin-newrelic: Error sending trace data ${error}`;
    if (logger.errorListenerSet) {
      logger.emit(`error`, new Error(err));
    }
    console.error(err);
  }
};

/**
 * Run any tracer cleanup required before the node.js process
 * exits. For Zipkin HTTP, we must manually process any spans still on
 * the queue
 */
const stop = async () => {
    // First, write all partial spans to the http logger
  recorder.partialSpans.forEach((span, id) => {
    if (span.timeoutTimestamp < now()) {
      recorder._writeSpan(id);
    }
  }); // Then tell http logger to process all spans in its queue
  await _processQueue();
};

module.exports = { create, stop };
