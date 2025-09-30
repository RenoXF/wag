import * as Sentry from "@sentry/node";
declare const SENTRY_DSN: string;

export const sentryDsn = Bun.env.SENTRY_DSN ?? typeof SENTRY_DSN === 'string' ? SENTRY_DSN : null;
if (sentryDsn) {
  console.log("Initializing Sentry");
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    tracesSampleRate: 0.5,
    profilesSampleRate: 0.5,
    enableLogs: true,
  });
}

export const traceSentry = (e:unknown, hint?: Sentry.EventHint) => {
  if (sentryDsn) {
    Sentry.captureException(e, hint);
  }
}
