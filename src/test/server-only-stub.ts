// "server-only" throws unconditionally outside Next's RSC build pipeline;
// vitest.config.ts aliases the real package to this no-op stub so plain
// server modules can be imported directly in tests.
export {};
