FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY vite.config.mjs ./
COPY web ./web
COPY tests/fixtures ./tests/fixtures
COPY tools/build-artifacts.mjs ./tools/build-artifacts.mjs
RUN npm run build:qa

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.tools/qa-dist /usr/share/nginx/html
EXPOSE 8080
