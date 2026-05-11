// Minimal analytics stub. Same surface as etapa/analyticsService so
// screens can call `analytics.events.foo(...)` without us needing to
// wire up PostHog right away.

const noop = () => {};

const analytics = {
  init: noop,
  identify: noop,
  reset: noop,
  maybeStartRecordingForScreen: noop,
  events: new Proxy({}, { get: () => noop }),
};

export default analytics;
