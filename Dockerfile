# syntax = docker/dockerfile:1
FROM node:20.18.0-slim
LABEL fly_launch_runtime="Node.js"
WORKDIR /app

RUN apt-get update -qq && \
 apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install TypeScript globally (optional, can be removed if using project-local tsc)
RUN npm install -g typescript

# Copy necessary source code
COPY backend-worlddex/package.json backend-worlddex/package-lock.json ./backend-worlddex/
COPY shared/package.json ./shared/

# Install dependencies for shared first
RUN cd shared && npm install

# Install dependencies for backend
RUN cd backend-worlddex && npm install

# Copy the rest of the source code
COPY backend-worlddex/ ./backend-worlddex/
COPY shared/ ./shared/

# Build shared package first
RUN cd shared && npm run build
RUN ls -R shared/dist

# Build the main project (backend), list output, and verify
ARG CACHE_BUSTER=1
RUN cd backend-worlddex && npx tsc --build --verbose

# Move the compiled output from the nested directory to the correct dist location
RUN cd backend-worlddex && \
    mkdir -p dist_final && \
    mv dist/backend-worlddex/src/* dist_final/ && \
    rm -rf dist && \
    mv dist_final dist

# Verify the final structure
RUN cd backend-worlddex && \
    ls -R dist && \
    test -f dist/index.js || (echo "FINAL CHECK FAILED: dist/index.js missing after move!" && exit 1)

ENV NODE_ENV="production"

RUN apt-get update && \
    apt-get install -y --no-install-recommends redis-server && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory for the final command
WORKDIR /app/backend-worlddex

EXPOSE 3000
CMD ["node", "backend-worlddex/dist/index.js"]