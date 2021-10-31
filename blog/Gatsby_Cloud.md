# Measuring Gatsby Build Performance with New Relic and Gatsby Cloud

 
At New Relic, we are avid Gatsby users. Our [documentation site](http://docs.newrelic.com) is one of the largest Gatsby sites on the web with more than 8,000 markdown files and 30 content changes a day. Building Gatsby sites at this scale means that small changes to the theme can lead to drastic changes in build times, which currently sits at around 45 minutes. 
 
To get more data from the Gatsby build process, the Developer Enablement team created the [gatsby-build-newrelic](https://github.com/newrelic-experimental/gatsby-build-newrelic) plugin. This plugin exports logs, traces, and metrics into New Relic which can help contextualize and identify performance issues within our website plugins, third-party APIs, and other parts of our website. 

Now you can export and analyze metrics, logs, and traces to understand which APIs, plugins, or code changes are affecting build times for your website with the [gatsby-build-newrelic](https://github.com/newrelic-experimental/gatsby-build-newrelic) plugin. The plugin hooks into the internal APIs of the [Gatsby](https://www.gatsbyjs.com/docs/conceptual/overview-of-the-gatsby-build-process/) framework and provides granular build data directly in New Relic so you can debug and optimize your build times. This blog post walks through some best practices for measuring the performance of a large Gatsby site, which you can try out for yourself in a [New Relic forever free account](https://newrelic.com/signup).


1. Run the following command in the directory containing your Gatsby site:
```
npm i gatsby-build-newrelic
```

2. Add the code snippet to `gatsby-config.js` under `plugins: [ ...`

```javascript
 {
      resolve: "gatsby-build-newrelic",
      options: {
        NR_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
        NR_ACCOUNT_ID: process.env.NEW_RELIC_ACCOUNT_ID,
        SITE_NAME: process.env.SITE_NAME,
        customTags: {
          featureFlag: process.env.FEATURE_FLAG,
        }
      }
    },
```

3. Then, deploy your site to Gatsby Cloud. In the step to fill out the environmental variables, click `Bulk Add Variables` and copy and paste the following. 
```
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_ACCOUNT_ID= 
SITE_NAME= <This can be anything>
FEATURE_FLAG= <This can be anything>
GATSBY_OPEN_TRACING_CONFIG_FILE=node_modules/gatsby-build-newrelic/zipkin-local.js
```
<img width="1451" alt="Screen Shot 2021-10-31 at 3 36 31 PM" src="https://user-images.githubusercontent.com/10321085/139603438-bc6dc1e7-adc5-4e24-a902-005b02a72e96.png">

You will need two environmental variables `NEW RELIC INGEST LICENSE KEY` and `Account ID`. Head to [New Relic One](https://one.newrelic.com), click on the account dropdown menu on the top right, and select API KEYS

![image](https://user-images.githubusercontent.com/10321085/139111763-40105088-064b-41f2-b338-d8bbf362de75.png)


4. 🎨 Visualizing your builds
Head over to the [Gatsby Builds Quickstart](https://developer.newrelic.com/instant-observability/gatsby-build/d234c09c-3338-4713-8340-ca75766445d6/) to get prepopulated dashboards. To get started, click the `+ Install quickstart` button. 
![Screen Shot 2021-10-27 at 10 00 31 AM](https://user-images.githubusercontent.com/10321085/139113789-ee91016b-af20-4d1a-90ef-096c6cf06a33.png)
Click on `Begin Installation`
![Screen Shot 2021-10-27 at 10 12 26 AM](https://user-images.githubusercontent.com/10321085/139113987-cad66bd6-4974-48d5-873e-3439e094052e.png)
Since we already instrumented our Gatsby site, we can Skip the installation process. Click `Skip this step`
![Screen Shot 2021-10-27 at 10 12 43 AM](https://user-images.githubusercontent.com/10321085/139114095-07ff5bd3-139d-4455-90b1-19c6d345499e.png)
When you click `See your data` you should be dropped into your new ✨ beautiful ✨ Gatsby Build dashboard

![image](https://user-images.githubusercontent.com/10321085/139114484-654cf27a-ca8c-4341-a757-5cfa99d50295.png)
