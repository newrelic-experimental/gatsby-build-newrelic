"use strict";

var _process$env$BENCHMAR;

require("newrelic");

const fs = require(`fs`);

const {
  cpuCoreCount
} = require("gatsby-core-utils");

const coreCount = cpuCoreCount();

const {
  THEME_OPTIONS,
  CI_NAME,
  BENCHMARK_REPORTING_URL
} = require("gatsby-plugin-newrelic-test/utils/constants");

const newrelicFormatter = require("@newrelic/winston-enricher");

const NewrelicLogs = require("winston-to-newrelic-logs");

const winston = require("winston");

const {
  execToStr,
  execToInt
} = require("./utils/execTo");

const {
  getCiData
} = require("./utils/getCiData");

const {
  performance
} = require(`perf_hooks`);

const {
  sync: glob
} = require(`fast-glob`);

const nodeFetch = require(`node-fetch`); // Create a logger instance


const winstonLogger = winston.createLogger({
  transports: [new NewrelicLogs({
    licenseKey: THEME_OPTIONS.NR_LICENSE_KEY,
    apiUrl: `https://${THEME_OPTIONS.staging && `staging-`}log-api.newrelic.com`,
    pluginOptions: THEME_OPTIONS
  })],
  format: newrelicFormatter()
});
let DELETED_PAGES,
    CHANGED_PAGES,
    CLEARING_CACHE = false,
    LOGS_STARTED = false;

if (THEME_OPTIONS.NR_LICENSE_KEY) {
  if (THEME_OPTIONS.logs.collectLogs) {
    !LOGS_STARTED && console.log(`[@] gatsby-plugin-newrelic: Streaming logs`);
    LOGS_STARTED = true;
    const originalStdoutWrite = process.stdout.write.bind(process.stdout); // Remove loading braille characters from log strings

    const brailleRegex = /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏|\n/g; // Remove ANSI escape codes from log string

    const regex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    const deletedPagesRegex = /Deleted (.*?) pages/g;
    const changedPagesRegex = /Found (.*?) changed pages/g;
    const clearingCache = `we're deleting your site's cache`;
    const ALREADY_LOGGED = {
      "source and transform nodes": false,
      "building schema": false,
      createPages: false,
      createPagesStatefully: false,
      "extract queries from components": false,
      "write out redirect data": false,
      onPostBootstrap: false,
      "Building production JavaScript and CSS bundles": false,
      "JavaScript and CSS webpack compilation Building HTML renderer": false,
      "JavaScript and CSS webpack compilation": false,
      "Building HTML renderer": false,
      "warn GATSBY_NEWRELIC_ENV env variable is not set": false,
      onPostBuild: false,
      "initialize cache": false
    };

    process.stdout.write = (chunk, encoding, callback) => {
      let copyChunk = chunk;

      if (typeof copyChunk === "string") {
        try {
          copyChunk = copyChunk.replace(regex, "").replace(brailleRegex, "").trimStart();

          if (Object.keys(ALREADY_LOGGED).includes(copyChunk)) {
            if (ALREADY_LOGGED[copyChunk]) {
              return originalStdoutWrite(chunk, encoding, callback);
            } else {
              ALREADY_LOGGED[copyChunk] = true;
            }
          }

          let deletedPages = deletedPagesRegex.exec(copyChunk);
          let changedPages = changedPagesRegex.exec(copyChunk);

          if (deletedPages) {
            DELETED_PAGES = deletedPages[1];
          }

          if (changedPages) {
            CHANGED_PAGES = changedPages[1];
          }

          if (copyChunk.includes(clearingCache)) {
            CLEARING_CACHE = true;
          }

          if (copyChunk !== "") {
            winstonLogger.log({
              level: "info",
              message: copyChunk
            });
          }
        } catch (err) {
          winstonLogger.log({
            level: "error",
            message: err.message
          });
        }
      }

      return originalStdoutWrite(chunk, encoding, callback);
    };

    console.error = function (msg) {
      winstonLogger.log({
        level: "error",
        message: msg
      });
    };

    console.warn = function (msg) {
      //
      winstonLogger.log({
        level: "warn",
        message: msg
      });
    };
  }
}

const bootstrapTime = performance.now();
let lastApi; // Current benchmark state, if any. If none then create one on next lifecycle.

let benchMeta;
let nextBuildType = (_process$env$BENCHMAR = process.env.BENCHMARK_BUILD_TYPE) !== null && _process$env$BENCHMAR !== void 0 ? _process$env$BENCHMAR : `initial`;

function reportInfo(...args) {
  (lastApi ? lastApi.reporter : console).info(...args);
}

function reportError(...args) {
  (lastApi ? lastApi.reporter : console).error(...args);
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
      var _JSON$parse$siteId, _JSON$parse, _process$env$GATSBY_T, _process$env;

      siteId = (_JSON$parse$siteId = (_JSON$parse = JSON.parse((_process$env$GATSBY_T = (_process$env = process.env) === null || _process$env === void 0 ? void 0 : _process$env.GATSBY_TELEMETRY_TAGS) !== null && _process$env$GATSBY_T !== void 0 ? _process$env$GATSBY_T : `{}`)) === null || _JSON$parse === void 0 ? void 0 : _JSON$parse.siteId) !== null && _JSON$parse$siteId !== void 0 ? _JSON$parse$siteId : ``;
    } catch (e) {
      siteId = `error`;
      reportInfo(`[@] gatsby-plugin-newrelic: Suppressed an error trying to JSON.parse(GATSBY_TELEMETRY_TAGS): ${e}`);
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
        reportInfo(`[@] gatsby-plugin-newrelic: Suppressed an error trying to JSON.parse(INCOMING_HOOK_BODY): ${e}`);
      }
    }

    return {
      siteId,
      buildType
    };
  }

  getData() {
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


    const ciAttributes = getCiData();
    const gitHash = execToStr(`git rev-parse HEAD`); // Git only supports UTC tz through env var, but the unix time stamp is UTC

    const gitAuthor = execToStr(`git show ${gitHash} | grep Author`);
    const gitRepoName = execToStr("basename `git rev-parse --show-toplevel`");
    const unixStamp = execToStr(`git show --quiet --date=unix --format="%cd"`);
    const gitCommitTimestamp = new Date(parseInt(unixStamp, 10) * 1000).toISOString();
    const nodeEnv = process.env.NODE_ENV || "n/a";
    const nodejsVersion = process.version;
    const gatsbyCliVersion = execToStr(`node_modules/.bin/gatsby --version`);

    const gatsbyVersion = require(`gatsby/package.json`).version;

    const sharpVersion = fs.existsSync(`node_modules/sharp/package.json`) ? require(`sharp/package.json`).version : `none`;

    const webpackVersion = require(`webpack/package.json`).version;

    const publicJsSize = glob(`public/*.js`).reduce((t, file) => t + fs.statSync(file).size, 0);
    const mdxCount = execToInt(`find public .cache  -type f -iname "*.mdx" | wc -l`);
    const jpgCount = execToInt(`find public .cache  -type f -iname "*.jpg" -or -iname "*.jpeg" | wc -l`);
    const pngCount = execToInt(`find public .cache  -type f -iname "*.png" | wc -l`);
    const gifCount = execToInt(`find public .cache  -type f -iname "*.gif" | wc -l`);
    const otherImagesCount = execToInt(`find public .cache  -type f -iname "*.bmp" -or -iname "*.tif" -or -iname "*.webp" -or -iname "*.svg" | wc -l`);
    const benchmarkMetadata = this.getMetadata();
    const attributes = { ...ciAttributes,
      ...benchmarkMetadata,
      ...THEME_OPTIONS.metrics.tags,
      gatsbySite: THEME_OPTIONS.SITE_NAME,
      buildId: THEME_OPTIONS.buildId,
      gitHash,
      gitAuthor,
      gitCommitTimestamp,
      gitRepoName,
      ciName: CI_NAME,
      nodeEnv,
      newRelicSiteName: THEME_OPTIONS.SITE_NAME,
      nodejs: nodejsVersion,
      gatsby: gatsbyVersion,
      gatsbyCli: gatsbyCliVersion,
      sharp: sharpVersion,
      webpack: webpackVersion,
      coreCount: coreCount,
      deletedPages: DELETED_PAGES,
      changedPages: CHANGED_PAGES,
      clearedCache: CLEARING_CACHE
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
      metrics: [{
        name: "mdxFiles",
        type: "gauge",
        value: mdxCount,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "jsSize",
        type: "gauge",
        value: publicJsSize,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "pngs",
        type: "gauge",
        value: pngCount,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "jpgs",
        type: "gauge",
        value: jpgCount,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "otherImages",
        type: "gauge",
        value: otherImagesCount,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "gifs",
        type: "gauge",
        value: gifCount,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "memory-rss",
        type: "gauge",
        value: rss !== null && rss !== void 0 ? rss : 0,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "memory-heapTotal",
        type: "gauge",
        value: heapTotal !== null && heapTotal !== void 0 ? heapTotal : 0,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "memory-heapUsed",
        type: "gauge",
        value: heapUsed !== null && heapUsed !== void 0 ? heapUsed : 0,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "memory-external",
        type: "gauge",
        value: external !== null && external !== void 0 ? external : 0,
        timestamp: timestamp,
        attributes: attributes
      }, {
        name: "build-times",
        type: "gauge",
        value: timeelapsed,
        timestamp: timestamp,
        attributes: buildtimes
      }]
    }];
  }

  markStart() {
    if (this.started) {
      reportError(`[@] gatsby-plugin-newrelic: `, new Error(`Error: Should not call markStart() more than once`));
      process.exit(1);
    }

    this.timestamps.benchmarkStart = performance.now();
    this.started = true;
  }

  markDataPoint(name) {
    if (BENCHMARK_REPORTING_URL) {
      if (!(name in this.timestamps)) {
        reportError(`[@] gatsby-plugin-newrelic: Attempted to record a timestamp with a name (\`${name}\`) that wasn't expected`);
        process.exit(1);
      }
    }

    this.timestamps[name] = performance.now();
  }

  async markEnd() {
    if (!this.timestamps.benchmarkStart) {
      reportError(`[@] gatsby-plugin-newrelic:`, new Error(`Error: Should not call markEnd() before calling markStart()`));
      process.exit(1);
    }

    this.timestamps.benchmarkEnd = performance.now();
    return this.flush();
  }

  async flush() {
    const data = this.getData();
    const json = JSON.stringify(data, null, 2);

    if (!BENCHMARK_REPORTING_URL) {
      reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI BENCHMARK_REPORTING_URL not set, not submitting data`);
      this.flushed = true;
      return this.flushing = Promise.resolve();
    }

    if (!THEME_OPTIONS.NR_INGEST_KEY) {
      console.log(`[!] gatsby-plugin-newrelic: NR_INGEST_KEY not set`);
      this.flushed = true;
      return this.flushing = Promise.resolve();
    }

    reportInfo(`[@] gatsby-plugin-newrelic: Flushing benchmark data to remote server...`);
    let lastStatus = 0;
    this.flushing = nodeFetch(`${BENCHMARK_REPORTING_URL}`, {
      method: `POST`,
      headers: {
        "content-type": `application/json`,
        "Api-Key": THEME_OPTIONS.NR_INGEST_KEY
      },
      body: json
    }).then(res => {
      lastStatus = res.status;

      if ([401, 500].includes(lastStatus)) {
        reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI got ${lastStatus} response, waiting for text`);
        res.text().then(content => {
          reportError(`[@] gatsby-plugin-newrelic: Response error`, new Error(`MetricAPI responded with a ${lastStatus} error: ${content}`));
          process.exit(1);
        });
      }

      this.flushed = true; // Note: res.text returns a promise

      return res.text();
    });
    this.flushing.then(text => reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI response: ${lastStatus}: ${text}`));
    return this.flushing;
  }

}

function init() {
  if (!benchMeta && THEME_OPTIONS.metrics.collectMetrics) {
    benchMeta = new BenchMeta(); // This should be set in the gatsby-config of the site when enabling this plugin

    reportInfo(`[@] gatsby-plugin-newrelic: Will post benchmark data to: ${BENCHMARK_REPORTING_URL || `the CLI`}`);
    benchMeta.markStart();
  }
}

process.on(`exit`, () => {
  if (benchMeta && !benchMeta.flushed && BENCHMARK_REPORTING_URL) {
    // This is probably already a non-zero exit as otherwise node should wait for the last promise to complete
    reportError(`[@] gatsby-plugin-newrelic: error`, new Error(`This is process.exit(); [@] gatsby-plugin-newrelic: MetricAPI collector has not completely flushed yet`));
    process.stdout.write = originalStdoutWrite; // process.stderr.write = originalStderrWrite;

    process.exit(1);
  }
});

async function onPreInit(api) {
  var _THEME_OPTIONS$logs;

  !THEME_OPTIONS.NR_INGEST_KEY && reportInfo(`[!] gatsby-plugin-newrelic: NR_INGEST_KEY not set`);
  !THEME_OPTIONS.NR_LICENSE_KEY && reportInfo(`[!] gatsby-plugin-newrelic: NR_LICENSE_KEY not set`);
  !THEME_OPTIONS.traces.collectTraces && reportInfo("[!] gatsby-newrelic-plugin: Not collecting Traces");
  !((_THEME_OPTIONS$logs = THEME_OPTIONS.logs) !== null && _THEME_OPTIONS$logs !== void 0 && _THEME_OPTIONS$logs.collectLogs) && reportInfo("[!] gatsby-newrelic-plugin: Not collecting Logs");
  !THEME_OPTIONS.metrics.collectMetrics && reportInfo("[!] gatsby-newrelic-plugin: Not collecting Metrics");
  lastApi = api;
  init(`preInit`);
  THEME_OPTIONS.metrics.collectMetrics && benchMeta.markDataPoint(`preInit`);
}

async function onPreBootstrap(api) {
  lastApi = api;
  init(`preBootstrap`);
  THEME_OPTIONS.metrics.collectMetrics && benchMeta.markDataPoint(`preBootstrap`);
}

async function onPreBuild(api) {
  lastApi = api;
  init(`preBuild`);
  THEME_OPTIONS.metrics.collectMetrics && benchMeta.markDataPoint(`preBuild`);
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