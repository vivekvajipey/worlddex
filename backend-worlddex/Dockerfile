# syntax = docker/dockerfile:1
FROM node:20.18.0-slim
LABEL fly_launch_runtime="Node.js"
WORKDIR /app

RUN apt-get update -qq && \
 apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install TypeScript globally
RUN npm install -g typescript

COPY . .

# Install dependencies for both projects
RUN npm install
RUN ls -la node_modules
RUN cd shared && npm install
RUN ls -la shared/node_modules

# Build shared package first
RUN cd shared && npm run build
RUN ls -R shared/dist

# Build the main project
RUN npm run build
RUN ls -R dist

# Verify that the main build artifact exists
RUN test -f dist/index.js || (echo " dist/index.js missing!" && exit 1)

ENV NODE_ENV="production"

# Debug output directories

EXPOSE 3000
CMD ["npm", "run", "start"]