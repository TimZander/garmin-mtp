// A small log for the client tests: it keeps every line and, like a real log, removes the
// secrets it has been handed from each line as it arrives. `events` records the order of
// redactions and lines, so a test can check a serial was handed over before a later line.
import type { WatchLog } from '../src/index.js'

export class TestLog implements WatchLog {
  readonly lines: string[] = []
  readonly events: string[] = []
  private readonly secrets: string[] = []

  redact(secret: string | undefined): void {
    if (!secret) return
    this.secrets.push(secret)
    this.events.push(`redact ${secret}`)
  }

  private add(text: string): void {
    const line = this.secrets.reduce((t, s) => t.split(s).join('[serial]'), text)
    this.lines.push(line)
    this.events.push(`line ${line}`)
  }

  info(text: string): void {
    this.add(text)
  }

  ok(text: string): void {
    this.add(text)
  }

  error(text: string): void {
    this.add(text)
  }

  data(text: string): void {
    this.add(text)
  }

  text(): string {
    return this.lines.join('\n')
  }
}
