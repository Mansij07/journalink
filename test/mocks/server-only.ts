// Real `server-only` unconditionally throws when imported — Next.js's webpack
// config special-cases it away for server bundles. Vitest doesn't run through
// that build, so vitest.config.ts aliases "server-only" to this no-op instead.
export {}
