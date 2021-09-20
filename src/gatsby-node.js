"use strict";

const fs = require(`fs`);

const {
  cpuCoreCount
} = require("gatsby-core-utils");

const {
  PLUGIN_OPTIONS,
  BENCHMARK_REPORTING_URL
} = require("gatsby-plugin-newrelic-test/utils/constants");

const NewrelicLogs = require("winston-to-newrelic-logs");

const winston = require("winston");

const {
  execToStr,
  execToInt
} = require("./utils/execTo");

const getCiData = require("./utils/getCiData");

const {
  performance
} = require(`perf_hooks`);

const {
  sync: glob
} = require(`fast-glob`);

const nodeFetch = require(`node-fetch`);
const { processFile, postEvents, collectBundleJson } = require(`./utils/parseJson`);
const coreCount = cpuCoreCount();

const isString = x => typeof x === "string";

let DELETED_PAGES,
    CHANGED_PAGES,
    CLEARING_CACHE = false,
    LOGS_STARTED = false;
const {
  NR_LICENSE_KEY,
  NR_INGEST_KEY,
  staging,
  collectLogs = true,
  collectMetrics = true,
  collectTraces = true,
  collectBundleSize = true,
  customTags = {},
} = PLUGIN_OPTIONS; // Create a logger instance
// process.stdout._handle.setBlocking(true);
const winstonLogger = winston.createLogger({
  transports: [new NewrelicLogs({
    licenseKey: NR_LICENSE_KEY,
    apiUrl: `https://${staging ? `staging-` : ``}log-api.newrelic.com`,
    pluginOptions: PLUGIN_OPTIONS
  })],
});

if (NR_LICENSE_KEY && collectLogs) {
  !LOGS_STARTED && console.log(`[@] gatsby-plugin-newrelic: Streaming logs`);
  LOGS_STARTED = true;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr); // Remove loading braille characters from log strings

  const brailleRegex = /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏|\n/g; // Remove ANSI escape codes from log string

  const regex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  const deletedPagesRegex = /Deleted (.*?) pages/g;
  const changedPagesRegex = /Found (.*?) changed pages/g;
  const clearingCache = `we're deleting your site's cache`; // Only log repeated messages once
  // const ALREADY_LOGGED = {
  //   "source and transform nodes": false,
  //   "building schema": false,
  //   createPages: false,
  //   createPagesStatefully: false,
  //   "extract queries from components": false,
  //   "write out redirect data": false,
  //   onPostBootstrap: false,
  //   "Building production JavaScript and CSS bundles": false,
  //   "JavaScript and CSS webpack compilation Building HTML renderer": false,
  //   "JavaScript and CSS webpack compilation": false,
  //   "Building HTML renderer": false,
  //   "warn GATSBY_NEWRELIC_ENV env variable is not set": false,
  //   onPostBuild: false,
  //   "initialize cache": false,
  // };

  process.stdout.write = (chunk, encoding, callback) => {
    if (isString(chunk)) {
      try {
        const copyChunk = chunk.replace(regex, "").replace(brailleRegex, "").trimStart(); // if (Object.keys(ALREADY_LOGGED).includes(copyChunk)) {
        //   if (ALREADY_LOGGED[copyChunk]) {
        //     return originalStdoutWrite(chunk, encoding, callback);
        //   } else {
        //     ALREADY_LOGGED[copyChunk] = true;
        //   }
        // }

        const deletedPages = deletedPagesRegex.exec(copyChunk);
        const changedPages = changedPagesRegex.exec(copyChunk);

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

  process.stderr.write = (chunk, encoding, callback) => {
    if (isString(chunk)) {
      try {
        const copyChunk = chunk.replace(regex, "").replace(brailleRegex, "").trimStart(); // if (Object.keys(ALREADY_LOGGED).includes(copyChunk)) {

        if (copyChunk !== "") {
          winstonLogger.log({
            level: "error",
            message: copyChunk
          });
        }
      } catch (err) {
        console.error(`teeeeeeeeee ${JSON.stringify(err)}`)
        winstonLogger.log({
          level: "error",
          message: err.message
        });
      }
    }
    return originalStderrWrite(chunk, encoding, callback);
  };
}

let benchMeta;
let nextBuildType = process.env.BENCHMARK_BUILD_TYPE ? process.env.BENCHMARK_BUILD_TYPE : `initial`;

class BenchMeta {
  constructor() {
    this.flushing = undefined; // Promise of flushing if that has started

    this.lastApi = undefined; // Current benchmark state, if any. If none then create one on next lifecycle.

    this.flushed = false; // Completed flushing?

    this.localTime = new Date().toISOString();
    // this.netlifyHook = CI_NAME === "netlify" && process.env.INCOMMING_HOOK_BODY;
    this.timestamps = {
      // TODO: we should also have access to node's timing data and see how long it took before bootstrapping this script
      bootstrapTime: performance.now(),
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

  reportError(...args) {
    (this.lastApi ? this.lastApi.reporter : console).error(...args);
  }

  reportInfo(...args) {
    (this.lastApi ? this.lastApi.reporter : console).info(...args);
  }

  getSiteId() {
    let siteId = ``;

    try {
      if (process.env.GATSBY_TELEMETRY_TAGS) {
        siteId = JSON.parse(process.env.GATSBY_TELEMETRY_TAGS).siteId;
      }
    } catch (e) {
      siteId = `error`;
      this.reportInfo(`[@] gatsby-plugin-newrelic: Suppressed an error trying to JSON.parse(GATSBY_TELEMETRY_TAGS): ${e}`);
    }

    return siteId;
  }

  getBuildType() {
    /**
     * If we are running in netlify, environment variables can be attached using the INCOMING_HOOK_BODY
     * extract the configuration from there
     */
    let buildType = nextBuildType;
    nextBuildType = process.env.BENCHMARK_BUILD_TYPE_NEXT ? process.env.BENCHMARK_BUILD_TYPE_NEXT : `DATA_UPDATE`;

    // if (this.netlifyHook) {
    //   try {
    //     const incomingHookBody = JSON.parse(incomingHookBodyEnv);
    //     buildType = incomingHookBody && incomingHookBody.buildType;
    //   } catch (e) {
    //     this.reportInfo(`[@] gatsby-plugin-newrelic: Suppressed an error trying to JSON.parse(INCOMING_HOOK_BODY): ${e}`);
    //   }
    // }

    return buildType;
  }

  getMetadata() {
    const siteId = this.getSiteId();
    const buildType = this.getBuildType();
    return {
      siteId,
      buildType
    };
  }

  getAttributes() {
    const benchmarkMetadata = this.getMetadata();
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

    return { ...ciAttributes,
      ...benchmarkMetadata,
      ...customTags,
      buildId: PLUGIN_OPTIONS.buildId,
      gitHash,
      gitAuthor,
      gitCommitTimestamp,
      gitRepoName,
      nodeEnv,
      newRelicSiteName: PLUGIN_OPTIONS.SITE_NAME,
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
  }

  getData() {
    const {
      rss,
      heapTotal,
      heapUsed,
      external
    } = process.memoryUsage();
    const attributes = this.getAttributes();

    for (const key in this.timestamps) {
      this.timestamps[key] = Math.floor(this.timestamps[key]);
    } // For the time being, our target benchmarks are part of the main repo
    // And we will want to know what version of the repo we're testing with


    const publicJsSize = glob(`public/*.js`).reduce((t, file) => t + fs.statSync(file).size, 0);
    const mdxCount = execToInt(`find public .cache  -type f -iname "*.mdx" | wc -l`);
    const jpgCount = execToInt(`find public .cache  -type f -iname "*.jpg" -or -iname "*.jpeg" | wc -l`);
    const pngCount = execToInt(`find public .cache  -type f -iname "*.png" | wc -l`);
    const gifCount = execToInt(`find public .cache  -type f -iname "*.gif" | wc -l`);
    const otherImagesCount = execToInt(`find public .cache  -type f -iname "*.bmp" -or -iname "*.tif" -or -iname "*.webp" -or -iname "*.svg" | wc -l`);
    var timestamp = Date.now();
    const timeelapsed = this.timestamps.benchmarkEnd - this.timestamps.benchmarkStart;
    const buildtimes = {
      type: "gauge",
      timestamp,
      name: "build-times",
      value: timeelapsed,
      attributes: { ...attributes,
        ...this.timestamps
      }
    };
    const baseMetric = {
      type: "gauge",
      timestamp,
      attributes
    };
    const finalMetrics = [{
      name: "mdxFiles",
      value: mdxCount
    }, {
      name: "jsSize",
      value: publicJsSize
    }, {
      name: "pngs",
      value: pngCount
    }, {
      name: "jpgs",
      value: jpgCount
    }, {
      name: "otherImages",
      value: otherImagesCount
    }, {
      name: "gifs",
      value: gifCount
    }, {
      name: "memory-rss",
      value: rss ? rss : 0
    }, {
      name: "memory-heapTotal",
      value: heapTotal ? heapTotal : 0
    }, {
      name: "memory-heapUsed",
      value: heapUsed ? heapUsed : 0
    }, {
      name: "memory-external",
      value: external ? external : 0
    }].map(metric => ({ ...baseMetric,
      ...metric
    }));
    return [{
      metrics: [...finalMetrics, buildtimes]
    }];
  }

  markStart() {
    if (this.started) {
      this.reportError(`[@] gatsby-plugin-newrelic: `, new Error(`Error: Should not call markStart() more than once`));
      process.exit(1);
    }

    this.timestamps.benchmarkStart = performance.now();
    this.started = true;
  }

  markDataPoint(name, api) {
    this.lastApi = api;

    if (BENCHMARK_REPORTING_URL) {
      if (!(name in this.timestamps)) {
        this.reportError(`[@] gatsby-plugin-newrelic: Attempted to record a timestamp with a name (\`${name}\`) that wasn't expected`);
        process.exit(1);
      }
    }

    this.timestamps[name] = performance.now();
  }

  async markEnd() {
    if (!this.timestamps.benchmarkStart) {
      this.reportError(`[@] gatsby-plugin-newrelic:`, new Error(`Error: Should not call markEnd() before calling markStart()`));
      process.exit(1);
    }

    this.timestamps.benchmarkEnd = performance.now();
    return this.flush();
  }

  async processBundleJson() {
    const rawJson = collectBundleJson()
    const bundleEvents = await processFile(rawJson);
    const res = await postEvents(bundleEvents);

    if (res.status >= 300) {
      this.reportError(`[@] gatsby-plugin-newrelic: Response error`, new Error(`EventApi responded with a ${res.status} error: ${JSON.stringify(res.data)}`));
    } else {
      this.reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI EventApi: ${res.status}: ${JSON.stringify(res.data)}`);
    }
  }

  async flush() {
    const data = this.getData();
    const json = JSON.stringify(data, null, 2);

    if (collectBundleSize) {
      this.reportInfo(`[@] gatsby-plugin-newrelic: Collecting JS Bundle sizes`);
      await this.processBundleJson();
    }

    if (!BENCHMARK_REPORTING_URL) {
      this.reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI BENCHMARK_REPORTING_URL not set, not submitting data`);
      this.flushed = true;
      return this.flushing = Promise.resolve();
    }

    if (!NR_INGEST_KEY) {
      console.log(`[!] gatsby-plugin-newrelic: NR_INGEST_KEY not set`);
      this.flushed = true;
      return this.flushing = Promise.resolve();
    }

    this.reportInfo(`[@] gatsby-plugin-newrelic: Flushing benchmark data to remote server...`);
    const res = await nodeFetch(`${BENCHMARK_REPORTING_URL}`, {
      method: `POST`,
      headers: {
        "content-type": `application/json`,
        "Api-Key": NR_INGEST_KEY
      },
      body: json
    });
    const content = await res.text();

    if (res.status >= 300) {
      this.reportError(`[@] gatsby-plugin-newrelic: Response error`, new Error(`MetricAPI responded with a ${res.status} error: ${content}`));
    } else {
      this.reportInfo(`[@] gatsby-plugin-newrelic: MetricAPI response: ${res.status}: ${content}`);
    }

    this.flushed = true; // Note: res.text returns a promise

    return content;
  }

}

function init() {
  if (!benchMeta && collectMetrics) {
    benchMeta = new BenchMeta(); // This should be set in the gatsby-config of the site when enabling this plugin

    benchMeta.reportInfo(`[@] gatsby-plugin-newrelic: Will post benchmark data to: ${BENCHMARK_REPORTING_URL || `the CLI`}`);
    benchMeta.markStart();
  }
}

process.on(`exit`, () => {
  if (benchMeta && !benchMeta.flushed && BENCHMARK_REPORTING_URL) {
    // This is probably already a non-zero exit as otherwise node should wait for the last promise to complete
    try {
      benchMeta.flush();
    } catch (error) {
      benchMeta.reportError(`[@] gatsby-plugin-newrelic: error`, new Error(`This is process.exit(); [@] gatsby-plugin-newrelic: MetricAPI collector has not completely flushed yet`));
    }

    process.stdout.write = originalStdoutWrite ? originalStdoutWrite : process.stdout.write;
    process.stderr.write = originalStderrWrite ? originalStderrWrite : process.stderr.write;
    process.exit(1);
  }
});

async function onPreInit(api) {
  !NR_INGEST_KEY && console.info(`[!] gatsby-plugin-newrelic: NR_INGEST_KEY not set`);
  !NR_LICENSE_KEY && console.info(`[!] gatsby-plugin-newrelic: NR_LICENSE_KEY not set`);
  !collectTraces && console.info("[!] gatsby-newrelic-plugin: Not collecting Traces");
  !collectLogs && console.info("[!] gatsby-newrelic-plugin: Not collecting Logs");
  !collectMetrics && console.info("[!] gatsby-newrelic-plugin: Not collecting Metrics");
  !collectBundleSize && console.info("[!] gatsby-newrelic-plugin: Not collecting JS Bundle Size");
  init(`preInit`);
  collectMetrics && benchMeta.markDataPoint(`preInit`, api);
}

async function onPreBootstrap(api) {
  init(`preBootstrap`);
  collectMetrics && benchMeta.markDataPoint(`preBootstrap`, api);
}

async function onPreBuild(api) {
  init(`preBuild`);
  collectMetrics && benchMeta.markDataPoint(`preBuild`, api);
}

async function onPostBuild(api) {
  if (!benchMeta) {
    // Ignore. Don't start measuring on this event.
    return;
  }

  benchMeta.markDataPoint(`postBuild`, api);
  await benchMeta.markEnd();
  benchMeta = undefined;
}

module.exports = {
  onPreInit,
  onPreBootstrap,
  onPreBuild,
  onPostBuild
};