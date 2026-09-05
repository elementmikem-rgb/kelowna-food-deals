FROM node:22-alpine

# Headless Chromium for cron/fetch.ts's fetchAndExtractTextViaBrowser, used
# only for venues flagged venues.requiresBrowser (sites that load their
# specials/events content via client-side JS, invisible to a plain fetch --
# e.g. O'Flannigan's). Playwright publishes no Alpine browser builds, so
# playwright-core drives Alpine's own `chromium` package via an explicit
# executablePath instead (CHROMIUM_PATH, read by resolveChromiumPath()).
# Same pattern already proven in the Photaro project. ~180MB.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
# Full install (not --production) -- next build needs the devDependencies
# (typescript, tailwind, eslint), and the cron/seed scripts need tsx/dotenv
# at runtime too, so nothing gets pruned after the build.
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
