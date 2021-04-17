FROM node:14-alpine as default 
EXPOSE 80
ENV PORT=80

# Add tiny
RUN apk add --no-cache tini

FROM node:14-alpine as buildStage
WORKDIR /src
# Copy everything
COPY . .

RUN yarn --frozen-lockfile
RUN yarn fix
RUN yarn build
#exclude yarn devDependencies
RUN yarn --frozen-lockfile --prod

# Switch image to get rid of all unnecessary stuff
FROM default as final

WORKDIR /app
COPY --from=buildStage /src/dist ./dist
COPY --from=buildStage /src/node_modules ./node_modules
COPY --from=buildStage /src/package.json ./
COPY --from=buildStage /src/yarn.lock ./

ENTRYPOINT [ "/sbin/tini", "--", "node", "dist/index.js" ]