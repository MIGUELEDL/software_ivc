import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/observability/sentry-options";

// Runtime edge: sem Node-APIs; mesmas opções errors-only.
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
