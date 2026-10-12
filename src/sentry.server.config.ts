import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/observability/sentry-options";

// Runtime Node.js: DSN só via server env (nunca NEXT_PUBLIC aqui).
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
