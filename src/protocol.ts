export type Mode = 'demo' | 'flywire'
export type Issue = {title: string; office: string; brief: string}
export type City = {day: number; treasury: number; corruption: number; satisfaction: number; audit: number}
export type Metric = Exclude<keyof City, 'day'>
export type Result = {type: 'result'; winner: number | null; ruling: {title: string; quote: string; consequence: string}; state: City; changes: Record<Metric, number>; ending: string | null}
export type Frame = {type: 'frame'; elapsed: number; counts: number[]; spikes: number; active: number; events: [number, number][]}
export type Ready = {type: 'ready'; neurons: number; duration: number; score_until: number; panel_size: number; root_ids: string[][] | null}
export type Stimulus = {type: 'stimulus'; rates: number[]; mode: Mode}
export type Event = Frame | Ready | Stimulus | Result | {type:'error'; message:string}
export type Bootstrap = {state: City; max_days: number; issues: Record<string, Issue>; flywire: {available: boolean; reason: string | null}}
export type Log = {day: number; issue: string; mode: Mode; result: Result}
export type Campaign = {city: City; log: Log[]}

export async function consume(response: Response, handle: (e: Event) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'No se pudo abrir el ensayo. Revisa la conexión local.')
  }
  if (!response.body) throw new Error('El navegador no recibió el registro.')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = '', hasResult = false
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line) continue
        const event = JSON.parse(line) as Event
        if (event.type === 'error') throw new Error(event.message)
        handle(event)
        hasResult ||= event.type === 'result'
      }
    }
    if (!hasResult) throw new Error('El ensayo se interrumpió. El expediente sigue abierto.')
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
