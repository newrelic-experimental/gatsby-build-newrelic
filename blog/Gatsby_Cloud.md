# Measuring Gatsby Build Performance with New Relic and Gatsby Cloud

 
At New Relic, we are avid Gatsby users. Our [documentation site](http://docs.newrelic.com) is one of the largest Gatsby sites on the web with more than 8,000 markdown files and 30 content changes a day. Building Gatsby sites at this scale means that small changes to the theme can lead to drastic changes in build times, which currently sits at around 45 minutes. 
 
To get more data from the Gatsby build process, the Developer Enablement team created the [gatsby-build-newrelic](https://github.com/newrelic-experimental/gatsby-build-newrelic) plugin. This plugin exports logs, traces, and metrics into New Relic which can help contextualize and identify performance issues within our website plugins, third-party APIs, and other parts of our website. 

Now you can export and analyze metrics, logs, and traces to understand which APIs, plugins, or code changes are affecting build times for your website with the [gatsby-build-newrelic](https://github.com/newrelic-experimental/gatsby-build-newrelic) plugin. The plugin hooks into the internal APIs of the [Gatsby](https://www.gatsbyjs.com/docs/conceptual/overview-of-the-gatsby-build-process/) framework and provides granular build data directly in New Relic so you can debug and optimize your build times. This blog post walks through some best practices for measuring the performance of a large Gatsby site, which you can try out for yourself in a [New Relic forever free account](https://newrelic.com/signup).
