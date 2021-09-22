[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# gatsby-build-newrelic

> This build plugin hooks into **Performance Traces** and **Logs** produced by the Gatsby framework and provides granular build data directly in New Relic so you can debug and optimize your build times.

## Install
```bash
npm i gatsby-build-newrelic
```

## Getting Started
>[Simple steps to start working with the software similar to a "Hello World"]


## Usage
>[**Optional** - Include more thorough instructions on how to use the software. This section might not be needed if the Getting Started section is enough. Remove this section if it's not needed.]


## Get Environmental Variables from New Relic 
### Get Ingest License Key
![Screen Shot 2021-09-22 at 2 50 17 PM](https://user-images.githubusercontent.com/10321085/134426856-79e962ad-dd46-4ad5-a7f1-e42e5c25524e.png)
```bash
export NEW_RELIC_LICENSE_KEY = <insert key here>
```

### Get INSERT LICENSE KEY + ACCOUNT NUMBER
![Screen Shot 2021-09-22 at 2 50 17 PM](https://user-images.githubusercontent.com/10321085/134427203-c9d452ef-ab16-4e60-af85-39a4e568c867.png)
![Screen Shot 2021-09-22 at 2 54 47 PM](https://user-images.githubusercontent.com/10321085/134427644-0987db49-e4f8-480b-b2cb-42222a5e87fe.png)
![Screen Shot 2021-09-22 at 2 55 40 PM](https://user-images.githubusercontent.com/10321085/134428081-4a391559-11c7-4c85-9921-2508cfdb4eb9.png)

```bash
export NEW_RELIC_INSERT_KEY = <insert insert key here> 
export NEW_RELIC_ACCOUNT_ID = <insert account number here> 
```

## Usage
In `gatsby-config.js`, add the following code snippet to configure the plugin

```javascript
{
  resolve: "gatsby-build-newrelic",
      options: {
        NR_INSERT_KEY: process.env.NEW_RELIC_INSERT_KEY || '',
        NR_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY || '',
        NR_ACCOUNT_ID: process.env.NEW_RELIC_ACCOUNT_ID,
        SITE_NAME: 'jankstack',
        customTags: { gatsbySite: true }
      }
}
```

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
