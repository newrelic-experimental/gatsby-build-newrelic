const { execToStr } = require('./execTo');
const gitCommit = execToStr(`git log --format="%H" -n 1`);

const getCiData = () => {
  if (process.env.NETLIFY) {
    return {
      gitRepoUrl: process.env.REPOSITORY_URL,
      gitBranch: process.env.BRANCH,
      gitHead: process.env.HEAD,
      gitCommit: process.env.COMMIT_REF,
      gitCachedCommit: process.env.CACHED_COMMIT_REF,
      gitPullRequest: process.env.PULL_REQUEST,
      gitReviewId: process.env.REVIEW_ID,
      buildId: process.env.BUILD_ID,
      context: process.env.CONTEXT,
      systemArchitecture: process.env._system_arch,
      systemVersion: process.env._system_version,
      url: process.env.URL,
      deployUrl: process.env.DEPLOY_URL,
      deployPrimeUrl: process.env.DEPLOY_PRIME_URL,
      deployId: process.env.DEPLOY_ID,
      ciSiteName: process.env.SITE_NAME,
      ciSiteId: process.env.SITE_ID,
      netlifyImagesCdnDomain: process.env.NETLIFY_IMAGES_CDN_DOMAIN,
      ciName: 'Netlify',
    };
  } else if (process.env.VERCEL) {
    return {
      gitRepoUrl: process.env.GATSBY_VERCEL_GIT_REPO_SLUG,
      gitBranch: process.env.GATSBY_VERCEL_GIT_COMMIT_REF,
      gitCommit: process.env.GATSBY_VERCEL_GIT_COMMIT_SHA,
      context: process.env.GATSBY_VERCEL_ENV,
      deployUrl: process.env.GATSBY_VERCEL_URL,
      deployRegion: process.env.GATSBY_VERCEL_REGION,
      ciName: 'Vercel',
    };
  } else if (process.env.GATSBY_CLOUD) {
    return {
      gitRepoUrl: execToStr(`git config --get remote.origin.url`),
      gitBranch: process.env.BRANCH,
      gatsbyIsPreview: process.env.GATSBY_IS_PREVIEW,
      gitCommit,
      ciName: 'Gatsby Cloud',
    };
  } else {
    return {
      gitRepoUrl: execToStr(`git config --get remote.origin.url`),
      gitCommit,
      gitBranch: execToStr(`git branch --show-current`),
      ciName: 'local',
    };
  }
};

module.exports = getCiData;
