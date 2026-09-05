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

# Under Railway's native Railpack/Nixpacks builder, service env vars are
# auto-injected during the build step -- Docker builds don't get that for
# free. `next build` touches every route module while collecting page data
# (even ones that render dynamically at runtime, and even on services like
# cron that never serve that route), and db/index.ts throws at import time
# if DATABASE_URL is missing. Railway auto-populates any ARG that matches a
# service variable name, so declaring it is enough to restore the value
# Railpack builds got automatically. (lib/stripe.ts used to need the same
# treatment for STRIPE_SECRET_KEY -- fixed properly instead by making it
# lazy-init, since the cron service has no Stripe key at all and never will.)
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
