import * as Sentry from "@sentry/node";
declare const SENTRY_DSN: string;

const sentryDsn = Bun.env.SENTRY_DSN ?? SENTRY_DSN;
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
