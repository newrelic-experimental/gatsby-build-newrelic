const axios = require("axios")
const {
  PLUGIN_OPTIONS
} = require("gatsby-build-newrelic/utils/constants");
const fs = require(`fs`);
const path = require('path');
const pako = require('pako');
const getCiData = require("./getCiData");

const { staging, euAccount, NR_LICENSE_KEY, NR_ACCOUNT_ID } = PLUGIN_OPTIONS;

const events = []

const getDeepestGroup = async (group, label) => {
  if (!group.groups) {
    const ciAttributes = await getCiData();
    let newEvent = {
      label,
      eventType: "bundleSize",
      ...group,
      ...ciAttributes,
      ...PLUGIN_OPTIONS.customTags,
    }

    events.push(newEvent)
    return
  }
  group.groups.forEach(group => {
    getDeepestGroup(group)
  })
}

const processFile = (jsonData) => {
  jsonData.forEach(asset => {
    asset.groups.forEach(group => {
      const { label } = group
      getDeepestGroup(group, label)
    })
  })

  return events;
}

const postEvents = async events => {
  let url = `https://insights-collector.newrelic.com/v1/accounts/${NR_ACCOUNT_ID}/events`;

  if (staging) {
    url = `https://staging-insights-collector.newrelic.com/v1/accounts/${NR_ACCOUNT_ID}/events`;
  } else if (euAccount) {
    url = `https://insights-collector.eu01.nr-data.net/v1/accounts/${NR_ACCOUNT_ID}/events`;
  }

  const json = JSON.stringify(events, null, 2);

  const res = await axios({
    method: 'post',
    url,
    headers: { 
      'content-type': 'application/json', 
      "Api-Key": NR_LICENSE_KEY, 
      "Content-Encoding": 'gzip' 
    },
    data: pako.gzip(json),
  });
  return res;
}

const collectBundleJson = () => {
  const rawdata = fs.readFileSync(path.resolve(__dirname, '../../../public/report.json'));
  const parsedData = JSON.parse(rawdata);
  return parsedData;
}

module.exports = { 
  postEvents,
  processFile,
  collectBundleJson 
};
