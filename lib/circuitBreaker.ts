import "server-only"

export interface CircuitBreakerOptions {
  name: string
  timeoutMs: number
  failureThreshold: number
  cooldownMs: number
  onTrip?: (name: string, failures: number) => void
  onReset?: (name: string) => void
}

export interface CircuitBreaker {
  isOpen(): boolean
  run<T>(op: () => Promise<T>, fallback: T): Promise<T>
  runOrThrow<T>(op: () => Promise<T>): Promise<T>
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`circuit breaker "${name}" is open`)
    this.name = "CircuitBreakerOpenError"
  }
}

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const { name, timeoutMs, failureThreshold, cooldownMs, onTrip, onReset } = options
  let failures = 0
  let openUntil = 0

  function isOpen(): boolean {
    return Date.now() < openUntil
  }

  function recordSuccess(): void {
    const wasTripped = openUntil > 0
    failures = 0
    openUntil = 0
    if (wasTripped) onReset?.(name) 
  }

  function recordFailure(): void {
    failures += 1
    if (failures >= failureThreshold) {
      openUntil = Date.now() + cooldownMs
      onTrip?.(name, failures)
    }
  }

  async function attempt<T>(op: () => Promise<T>): Promise<T> {
    const result = await Promise.race([
      op(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${name}: timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
    recordSuccess()
    return result
  }

  return {
    isOpen,
    async run(op, fallback) {
      if (isOpen()) return fallback
      try {
        return await attempt(op)
      } catch {
        recordFailure()
        return fallback
      }
    },
    async runOrThrow(op) {
      if (isOpen()) throw new CircuitBreakerOpenError(name)
      try {
        return await attempt(op)
      } catch (err) {
        recordFailure()
        throw err
      }
    },
  }
}
