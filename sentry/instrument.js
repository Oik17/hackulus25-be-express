import * as Sentry from "@sentry/node"

Sentry.init({
    dsn: "https://5fce7c9965f9e9dbb81cfc0e73189bf9@o4510040411078656.ingest.de.sentry.io/4510040414027856",
    // true will send default PII data to Sentry
    // eg auto IP address collection on events
    sendDefaultPii: true,
});