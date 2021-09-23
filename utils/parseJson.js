const axios = require("axios")
const {
  PLUGIN_OPTIONS
} = require("gatsby-build-newrelic/utils/constants");
const fs = require(`fs`);
const path = require('path');
const getCiData = require("./getCiData");

const events = []

const getDeepestGroup = (group, label) => {
  if (!group.groups) {
    const ciAttributes = getCiData();
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
  const res = await axios({
    method: 'post',
    url: `https://${PLUGIN_OPTIONS.staging ? `staging-` : ``}insights-collector.newrelic.com/v1/accounts/${PLUGIN_OPTIONS.NR_ACCOUNT_ID}/events`,
    headers: { 'content-type': 'application/json', "X-Insert-Key": PLUGIN_OPTIONS.NR_INSERT_KEY },
    data: events
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
