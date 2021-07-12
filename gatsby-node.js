"use strict";

require('newrelic');
const { cpuCoreCount } = require("gatsby-core-utils")
process.env.GATSBY_CPU_COUNT = "logical-cores"

const coreCount = cpuCoreCount()
const constants = require('./constants');
const newrelicFormatter = require('@newrelic/winston-enricher');

const NewrelicWinston = require('newrelic-winston');

const NewrelicLogs = require('winston-to-newrelic-logs');

const winston = require('winston');

const logger = winston.createLogger({
  transports: [new NewrelicLogs({
    licenseKey: constants.NR_LICENSE,
    apiUrl: 'https://log-api.newrelic.com'
  }), new NewrelicWinston()],
  format: winston.format.combine(winston.format.label({
    serviceName: 'GatsbyWinston'
  }), newrelicFormatter())
});
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const UNWANTED_LOGS = ['[2K[1A[2K[G', '', '\n']
const REPLACE_SUBSTRINGS = ['[34m', '[39m', '[2K[1A[2K[G', '[32m'];

process.stdout.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string' && !UNWANTED_LOGS.includes(chunk)) {
    try {
      REPLACE_SUBSTRINGS.forEach(sub => {
        chunk.replace(sub, "")
      });
    } catch(e) {
      console.log(e)
    }
    
    try {
      logger.log({
        level: 'info',
        message: chunk
      });
    } catch (e) {
      console.log(e)
    }

  }

  return originalStdoutWrite(chunk, encoding, callback);
};

var _process$env$BENCHMAR;

const {
  performance
} = require(`perf_hooks`);

const {
  sync: glob
} = require(`fast-glob`);

const nodeFetch = require(`node-fetch`);

const uuidv4 = require(`uuid/v4`);

const {
  execSync
} = require(`child_process`);

const fs = require(`fs`); 
console.error = function (d) {
  //
  logger.error(d, {
    logee: 'ruairi'
  });
};
console.log = function (d) {
  //
  logger.log({
    level: 'info',
    message: d
  });
};
console.warn = function (d) {
  //
  logger.log({
    level: 'warn',
    message: d
  });
};
console.info = function (d) {
  //
  logger.log({
    level: 'info',
    message: d
  });
}; // var capcon = require('capture-console');


const bootstrapTime = performance.now();
const CI_NAME = process.env.CI_NAME;
const BENCHMARK_REPORTING_URL = "https://metric-api.newrelic.com/metric/v1";
let lastApi; // Current benchmark state, if any. If none then create one on next lifecycle.

let benchMeta;
let nextBuildType = (_process$env$BENCHMAR = process.env.BENCHMARK_BUILD_TYPE) !== null && _process$env$BENCHMAR !== void 0 ? _process$env$BENCHMAR : `initial`;

function reportInfo(...args) {
  ;
  (lastApi ? lastApi.reporter : console).info(...args);
}

function reportError(...args) {
  ;
  (lastApi ? lastApi.reporter : console).error(...args);
}

function execToStr(cmd) {
  var _execSync;

  return String((_execSync = execSync(cmd, {
    encoding: `utf8`
  })) !== null && _execSync !== void 0 ? _execSync : ``).trim();
}

function execToInt(cmd) {
  // `parseInt` can return `NaN` for unexpected args
  // `Number` can return undefined for unexpected args
  // `0 | x` (bitwise or) will always return 0 for unexpected args, or 32bit int
  return execToStr(cmd) | 0;
}

class BenchMeta {
  constructor() {
    this.flushing = undefined; // Promise of flushing if that has started

    this.flushed = false; // Completed flushing?

    this.localTime = new Date().toISOString();
    this.timestamps = {
      // TODO: we should also have access to node's timing data and see how long it took before bootstrapping this script
      bootstrapTime,
      // Start of this file
      instantiationTime: performance.now(),
      // Instantiation time of this class
      benchmarkStart: 0,
      // Start of benchmark itself
      preInit: 0,
      // Gatsby onPreInit life cycle
      preBootstrap: 0,
      // Gatsby onPreBootstrap life cycle
      preBuild: 0,
      // Gatsby onPreBuild life cycle
      postBuild: 0,
      // Gatsby onPostBuild life cycle
      benchmarkEnd: 0 // End of benchmark itself

    };
    this.started = false;
  }

  getMetadata() {
    var _process$env$BENCHMAR2;

    let siteId = ``;

    try {
      var _JSON$parse$siteId, _JSON$parse, _process$env$GATSBY_T, _process$env; // The tags ought to be a json string, but we try/catch it just in case it's not, or not a valid json string


      siteId = (_JSON$parse$siteId = (_JSON$parse = JSON.parse((_process$env$GATSBY_T = (_process$env = process.env) === null || _process$env === void 0 ? void 0 : _process$env.GATSBY_TELEMETRY_TAGS) !== null && _process$env$GATSBY_T !== void 0 ? _process$env$GATSBY_T : `{}`)) === null || _JSON$parse === void 0 ? void 0 : _JSON$parse.siteId) !== null && _JSON$parse$siteId !== void 0 ? _JSON$parse$siteId : ``; // Set by server
    } catch (e) {
      siteId = `error`;
      reportInfo(`Suppressed an error trying to JSON.parse(GATSBY_TELEMETRY_TAGS): ${e}`);
    }
    /**
     * If we are running in netlify, environment variables can be attached using the INCOMING_HOOK_BODY
     * extract the configuration from there
     */


    let buildType = nextBuildType;
    nextBuildType = (_process$env$BENCHMAR2 = process.env.BENCHMARK_BUILD_TYPE_NEXT) !== null && _process$env$BENCHMAR2 !== void 0 ? _process$env$BENCHMAR2 : `DATA_UPDATE`;
    const incomingHookBodyEnv = process.env.INCOMING_HOOK_BODY;

    if (CI_NAME === `netlify` && incomingHookBodyEnv) {
      try {
        const incomingHookBody = JSON.parse(incomingHookBodyEnv);
        buildType = incomingHookBody && incomingHookBody.buildType;
      } catch (e) {
        reportInfo(`Suppressed an error trying to JSON.parse(INCOMING_HOOK_BODY): ${e}`);
      }
    }

    return {
      buildId: process.env.BENCHMARK_BUILD_ID,
      branch: process.env.BENCHMARK_BRANCH,
      siteId,
      contentSource: process.env.BENCHMARK_CONTENT_SOURCE,
      siteType: process.env.BENCHMARK_SITE_TYPE,
      repoName: process.env.BENCHMARK_REPO_NAME,
      buildType: buildType
    };
  }

  getData() {
    var _process$cwd; // Get memory usage snapshot first (just in case)


    const {
      rss,
      heapTotal,
      heapUsed,
      external
    } = process.memoryUsage();

    for (const key in this.timestamps) {
      this.timestamps[key] = Math.floor(this.timestamps[key]);
    } // For the time being, our target benchmarks are part of the main repo
    // And we will want to know what version of the repo we're testing with
    // This won't work as intended when running a site not in our repo (!)


    const gitHash = execToStr(`git rev-parse HEAD`); // Git only supports UTC tz through env var, but the unix time stamp is UTC

    const unixStamp = execToStr(`git show --quiet --date=unix --format="%cd"`);
    const commitTime = new Date(parseInt(unixStamp, 10) * 1000).toISOString();
    const nodejsVersion = process.version; // This assumes the benchmark is started explicitly from `node_modules/.bin/gatsby`, and not a global install
    // (This is what `gatsby --version` does too, ultimately)

    const gatsbyCliVersion = execToStr(`node_modules/.bin/gatsby --version`);

    const gatsbyVersion = require(`gatsby/package.json`).version;

    const sharpVersion = fs.existsSync(`node_modules/sharp/package.json`) ? require(`sharp/package.json`).version : `none`;

    const webpackVersion = require(`webpack/package.json`).version;

    const publicJsSize = glob(`public/*.js`).reduce((t, file) => t + fs.statSync(file).size, 0);
    const jpgCount = execToInt(`find public .cache  -type f -iname "*.jpg" -or -iname "*.jpeg" | wc -l`);
    const pngCount = execToInt(`find public .cache  -type f -iname "*.png" | wc -l`);
    const gifCount = execToInt(`find public .cache  -type f -iname "*.gif" | wc -l`);
    const otherCount = execToInt(`find public .cache  -type f -iname "*.bmp" -or -iname "*.tif" -or -iname "*.webp" -or -iname "*.svg" | wc -l`);
    const benchmarkMetadata = this.getMetadata();
    const attributes = {
      sessionId: process.gatsbyTelemetrySessionId || uuidv4(),
      gitHash,
      commitTime,
      ci: process.env.CI || false,
      ciName: CI_NAME || `local`,
      nodejs: nodejsVersion,
      gatsby: gatsbyVersion,
      gatsbyCli: gatsbyCliVersion,
      sharp: sharpVersion,
      webpack: webpackVersion,
      coreCount: coreCount,
      ...benchmarkMetadata
    };
    const buildtimes = { ...attributes,
      bootstrapTime: this.timestamps.bootstrapTime,
      instantiationTime: this.timestamps.instantiationTime,
      // Instantiation time of this class
      benchmarkStart: this.timestamps.benchmarkStart,
      // Start of benchmark itself
      preInit: this.timestamps.preInit,
      // Gatsby onPreInit life cycle
      preBootstrap: this.timestamps.preBootstrap,
      // Gatsby onPreBootstrap life cycle
      preBuild: this.timestamps.preBuild,
      // Gatsby onPreBuild life cycle
      postBuild: this.timestamps.postBuild,
      // Gatsby onPostBuild life cycle
      benchmarkEnd: this.timestamps.benchmarkEnd // End of benchmark itself

    };
    var timestamp = Date.now();
    const timeelapsed = this.timestamps.benchmarkEnd - this.timestamps.benchmarkStart;
    return [{
      "metrics": [{
        "name": "jsSize",
        "type": "gauge",
        "value": publicJsSize,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "pngs",
        "type": "gauge",
        "value": pngCount,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "jpgs",
        "type": "gauge",
        "value": jpgCount,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "otherImages",
        "type": "gauge",
        "value": otherCount,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "gifs",
        "type": "gauge",
        "value": gifCount,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "memory-rss",
        "type": "gauge",
        "value": rss !== null && rss !== void 0 ? rss : 0,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "memory-heapTotal",
        "type": "gauge",
        "value": heapTotal !== null && heapTotal !== void 0 ? heapTotal : 0,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "memory-heapUsed",
        "type": "gauge",
        "value": heapUsed !== null && heapUsed !== void 0 ? heapUsed : 0,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "memory-external",
        "type": "gauge",
        "value": external !== null && external !== void 0 ? external : 0,
        "timestamp": timestamp,
        "attributes": attributes
      }, {
        "name": "build-times",
        "type": "gauge",
        "value": timeelapsed,
        "timestamp": timestamp,
        "attributes": buildtimes
      }]
    }];
  }

  markStart() {
    if (this.started) {
      reportError(`gatsby-plugin-benchmark-reporting: `, new Error(`Error: Should not call markStart() more than once`));
      process.exit(1);
    }

    this.timestamps.benchmarkStart = performance.now();
    this.started = true;
  }

  markDataPoint(name) {
    if (BENCHMARK_REPORTING_URL) {
      if (!(name in this.timestamps)) {
        reportError(`Attempted to record a timestamp with a name (\`${name}\`) that wasn't expected`);
        process.exit(1);
      }
    }

    this.timestamps[name] = performance.now();
  }

  async markEnd() {
    if (!this.timestamps.benchmarkStart) {
      reportError(`gatsby-plugin-benchmark-reporting:`, new Error(`Error: Should not call markEnd() before calling markStart()`));
      process.exit(1);
    }

    this.timestamps.benchmarkEnd = performance.now();
    return this.flush();
  }

  async flush() {
    const data = this.getData();
    const json = JSON.stringify(data, null, 2);

    if (!BENCHMARK_REPORTING_URL) {
      // reportInfo(`Gathered data: ` + json);
      reportInfo(`BENCHMARK_REPORTING_URL not set, not submitting data`);
      this.flushed = true;
      return this.flushing = Promise.resolve();
    } // reportInfo(`Gathered data: ` + json);


    reportInfo(`Flushing benchmark data to remote server...`);
    let lastStatus = 0;
    this.flushing = nodeFetch(`${BENCHMARK_REPORTING_URL}`, {
      method: `POST`,
      headers: {
        "content-type": `application/json`,
        "Api-Key": constants.NR_KEY
      },
      body: json
    }).then(res => {
      lastStatus = res.status;

      if ([401, 500].includes(lastStatus)) {
        reportInfo(`Got ${lastStatus} response, waiting for text`);
        res.text().then(content => {
          reportError(`Response error`, new Error(`Server responded with a ${lastStatus} error: ${content}`));
          process.exit(1);
        });
      }

      this.flushed = true; // Note: res.text returns a promise

      return res.text();
    });
    this.flushing.then(text => reportInfo(`Server response: ${lastStatus}: ${text}`));
    return this.flushing;
  }

}

function init(lifecycle) {
  if (!benchMeta) {
    benchMeta = new BenchMeta(); // This should be set in the gatsby-config of the site when enabling this plugin

    reportInfo(`gatsby-plugin-benchmark-reporting: Will post benchmark data to: ${BENCHMARK_REPORTING_URL || `the CLI`}`);
    benchMeta.markStart();
  }
}

process.on(`exit`, () => {
  if (benchMeta && !benchMeta.flushed && BENCHMARK_REPORTING_URL) {
    // This is probably already a non-zero exit as otherwise node should wait for the last promise to complete
    reportError(`gatsby-plugin-benchmark-reporting error`, new Error(`This is process.exit(); Benchmark plugin has not completely flushed yet`));
    process.stdout.write = originalStdoutWrite;
    process.exit(1);
  }
});

async function onPreInit(api) {
  lastApi = api;
  init(`preInit`);
  benchMeta.markDataPoint(`preInit`);
}

async function onPreBootstrap(api) {
  lastApi = api;
  init(`preBootstrap`);
  benchMeta.markDataPoint(`preBootstrap`);
}

async function onPreBuild(api) {
  lastApi = api;
  init(`preBuild`);
  benchMeta.markDataPoint(`preBuild`);
}

async function onPostBuild(api) {
  if (!benchMeta) {
    // Ignore. Don't start measuring on this event.
    return;
  }

  lastApi = api;
  benchMeta.markDataPoint(`postBuild`);
  await benchMeta.markEnd();
  benchMeta = undefined;
}

module.exports = {
  onPreInit,
  onPreBootstrap,
  onPreBuild,
  onPostBuild
};