# Db-api repository of SwapShop Management Project

## Prerequisites

* Docker [Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
* Docker-compose [Mac/Windows/Linux](https://docs.docker.com/compose/install/)
* Node version ~14.15.4 [Node.js website](https://nodejs.org/en/download/package-manager/#snap) - it is worth to install Node using nvm [tutorial](https://nodesource.com/blog/installing-node-js-tutorial-using-nvm-on-mac-os-x-and-ubuntu/)

## List of env variables:

### Required

1. PORT - port express will listen to
2. MONGO_URI - URI of database that app should connect to
3. SECRET_KEY - secret key used for encoding jwt tokens. Recommended to be 32 random characters hex string

### Optional

All optional env variables are related to email dispatch functionality.
There are two ways of dispatching emails - with an email account only (dev) or with email account and email service (prod)
1. SWAPSHOP_EMAIL_PASSWORD - dev
2. SWAPSHOP_EMAIL - both
3. SWAPSHOP_EMAIL_SERVICE - dev
4. SWAPSHOP_EMAIL_PORT - port used for dispatching emails. Default set to 465.
5. AWS_SECRET_ACCESS_KEY - prod
6. AWS_ACCESS_KEY_ID - prod
7. AWS_HOST - prod
## Build

Make sure required env variables are stored in appropriate file (env.sh by default).

First run:

1. yarn - download dependencies
2. yarn build - build project
3. yarn mongo:start - create mongoDb docker container
4. . ./env.sh (or your own file) - feed env variables
5. node dist/index.js - start node up with dist/index.js as an entry file

Any future run:

1. yarn build
2. yarn mongo:start
3. . ./env.sh
4. node dist/index.js

