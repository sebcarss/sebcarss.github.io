// Minimal browser shims for jsdom render tests (no-op under node).
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }),
  });
}
if (typeof window !== "undefined") {
  // jsdom logs "not implemented" for scrolling; pages scroll to top on navigation.
  window.scrollTo = () => {};
}
