[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# [Name of Project] [build badges go here when available]

>[Brief description - what is the project and value does it provide? How often should users expect to get releases? How is versioning set up? Where does this project want to go?]

## Installation

> [Include a step-by-step procedure on how to get your code installed. Be sure to include any third-party dependencies that need to be installed separately]

## Getting Started
>[Simple steps to start working with the software similar to a "Hello World"]
Build Command:

```
NEW_RELIC_HOME='./node_modules/gatsby-build-newrelic' gatsby build --open-tracing-config-file ./node_modules/gatsby-build-newrelic/zipkin-local.js --graphql-tracing",
```

or

```
export NEW_RELIC_HOME='./node_modules/gatsby-build-newrelic'
```

## Usage
In `gatsby-config.js`, add the following code snippet to configure the plugin

```javascript
    {
      resolve: "gatsby-build-newrelic",
      options: {
        NR_LICENSE_KEY: "LICENSE KEY",
        SITE_NAME: "your-website-name",
        collectTraces: true, // This will default to true so you can remove
        collectLogs: true, // This will default to true so you can remove
        collectMetrics: true, // This will default to true so you can remove
        customTags: {
          gatsbySite: 'jankstack',
          newFeature: 'remove-jank',
        }
      },
    },
```

## Building

>[**Optional** - Include this section if users will need to follow specific instructions to build the software from source. Be sure to include any third party build dependencies that need to be installed separately. Remove this section if it's not needed.]

## Testing

>[**Optional** - Include instructions on how to run tests if we include tests with the codebase. Remove this section if it's not needed.]

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices. Like all official New Relic open source projects, there's a related Community topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

>Add the url for the support thread here

## Contributing
We encourage your contributions to improve [project name]! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

## License
[Project Name] is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
>[If applicable: The [project name] also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in the third-party notices document.]
