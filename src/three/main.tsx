import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, CircleHelp, Clapperboard, Landmark, Pause, Play, Radio, RotateCcw, ShieldAlert, Users, Wallet } from 'lucide-react'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import { consume, type Bootstrap, type Campaign, type Frame, type Mode, type Ready, type Stimulus } from '../protocol'
import { districtOrder, districts, type District } from './districts'
import { Theater, type Phase } from './Theater'
import './style.css'

const key = 'senor-mosca-3d-v1'
const briefTime = 3200
const rulingTime = 7200
const palette = ['#98e1bd','#f6c371','#ef9b8c']
const channels = ['Comunidad','Mercado','Vigilancia']
const fmt = new Intl.NumberFormat('es-MX')
const measures = [
  {id:'treasury', label:'Tesorería', icon:Wallet},
  {id:'corruption', label:'Corrupción', icon:ShieldAlert},
  {id:'satisfaction', label:'Aprobación', icon:Users},
  {id:'audit', label:'Presión de auditoría', icon:Landmark},
] as const

function initialCampaign(initial: Campaign): Campaign {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Campaign | null
    if (saved && Array.isArray(saved.log) && saved.city?.day===saved.log.length+1) return saved
  } catch { /* Storage is optional. */ }
  return initial
}

function NeuralPlot({events, ready, frame}: {events: Frame['events']; ready: Ready | null; frame: Frame | null}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const w = 620, h = 130
    const seconds = ready?.duration ?? 300
    const size = ready?.panel_size ?? 6
    const x = (t: number) => 12+t/seconds*(w-24)
    ctx.clearRect(0,0,w,h)
    ctx.fillStyle = '#111d20'
    ctx.fillRect(0,0,w,h)
    for (let row=0;row<3;row++) {
      ctx.fillStyle = palette[row]+'14'
      ctx.fillRect(12,7+row*38,w-24,32)
    }
    if (ready && ready.score_until < seconds) {
      ctx.fillStyle = '#f6c37130'
      ctx.fillRect(12,6,x(ready.score_until)-12,109)
    }
    for (const ratio of [0,.25,.5,.75,1]) {
      ctx.fillStyle = '#839e993b'
      ctx.fillRect(x(seconds*ratio),6,1,110)
    }
    for (const [lane, time] of events) {
      const row = Math.floor(lane/size)
      ctx.fillStyle = palette[row]
      ctx.fillRect(x(time),10+38*row+(lane%size)*28/size,2.4,3.5)
    }
    if (frame) {
      ctx.fillStyle = '#f7e4ba'
      ctx.fillRect(x(frame.elapsed),6,1.5,110)
    }
  },[events,ready,frame])
  return <div className="plot">
    <canvas ref={canvas} width={620} height={130} role="img" aria-label={`Raster neural: ${events.length} disparos de ${(ready?.panel_size ?? 6)*3} neuronas observadas`}/>
    {!events.length && <span>{frame ? 'Aún no hay disparos en el panel' : 'En espera de la simulación'}</span>}
  </div>
}

function App() {
  const [meta,setMeta] = useState<Bootstrap | null>(null)
  const [campaign,setCampaign] = useState<Campaign | null>(null)
  const [mode,setMode] = useState<Mode>('demo')
  const [phase,setPhase] = useState<Phase>('waiting')
  const [paused,setPaused] = useState(false)
  const [error,setError] = useState('')
  const [frame,setFrame] = useState<Frame | null>(null)
  const [ready,setReady] = useState<Ready | null>(null)
  const [stimulus,setStimulus] = useState<Stimulus | null>(null)
  const [events,setEvents] = useState<Frame['events']>([])
  const help = useRef<HTMLDialogElement>(null)
  const request = useRef<AbortController | null>(null)
  const last = campaign?.log.at(-1)
  const ending = last?.result.ending
  const index = (campaign?.log.length ?? 0) % districtOrder.length
  const selected = phase==='ruling' || phase==='complete' ? (last?.issue as District ?? districtOrder[index]) : districtOrder[index]
  const district = districts[selected]
  const brief = meta?.issues[selected]

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/bootstrap',{signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error()
      const data = await response.json() as Bootstrap
      const saved = initialCampaign({city:data.state,log:[]})
      const forcedDemo = new URLSearchParams(location.search).get('modo')==='demo'
      setMeta(data)
      setCampaign(saved)
      setMode(data.flywire.available && !forcedDemo ? 'flywire' : 'demo')
      setPhase(saved.log.at(-1)?.result.ending ? 'complete' : 'brief')
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError('No se pudo abrir la sesión.')
        setPhase('error')
      }
    })
    return () => {controller.abort(); request.current?.abort()}
  },[])

  useEffect(() => {
    if (campaign) try {sessionStorage.setItem(key,JSON.stringify(campaign))} catch { /* Storage is optional. */ }
  },[campaign])

  function clearReadout() {
    setFrame(null)
    setReady(null)
    setStimulus(null)
    setEvents([])
    setError('')
  }

  useEffect(() => {
    if (!campaign || paused || (phase!=='brief' && phase!=='ruling')) return
    const timer = window.setTimeout(async () => {
      if (phase==='ruling') {
        if (ending) setPhase('complete')
        else {
          clearReadout()
          setPhase('brief')
        }
        return
      }
      if (request.current) return
      const controller = new AbortController()
      request.current = controller
      setPhase('trial')
      try {
        const response = await fetch('/api/turn',{
          signal:controller.signal,method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({issue:selected,focus:'neutral',mode,state:campaign.city})
        })
        await consume(response,event => {
          if (event.type==='ready') setReady(event)
          if (event.type==='stimulus') setStimulus(event)
          if (event.type==='frame') {
            setFrame(event)
            setEvents(previous => [...previous,...event.events])
          }
          if (event.type==='result') {
            setCampaign({city:event.state,log:[...campaign.log,{day:campaign.city.day,issue:selected,mode,result:event}]})
            setPhase('ruling')
          }
        })
      } catch (problem) {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'El laboratorio no respondió.')
          setPhase('error')
        }
      } finally {
        if (request.current===controller) request.current=null
      }
    },phase==='brief' ? briefTime : rulingTime)
    return () => window.clearTimeout(timer)
  },[campaign,phase,paused,mode,selected,ending])

  function restart() {
    if (!meta) return
    clearReadout()
    setCampaign({city:meta.state,log:[]})
    setPaused(false)
    setPhase('brief')
  }

  function retry() {
    if (!meta) {location.reload(); return}
    clearReadout()
    setPaused(false)
    setPhase('brief')
  }

  const outcomes: Partial<Record<District, number | null>> = {}
  campaign?.log.forEach(entry => { outcomes[entry.issue as District]=entry.result.winner })
  const phaseText: Record<Phase,string> = {
    waiting:'Abriendo la sesión',brief:'Lectura del expediente',trial:'Simulación en curso',
    ruling:'Resolución del alcalde',complete:'Sesión concluida',error:'Sesión interrumpida',
  }
  const day = phase==='ruling' || phase==='complete' ? (last?.day ?? 1) : (campaign?.city.day ?? 1)

  return <>
    <header className="mast">
      <a className="municipio" href="/3d/"><span><Landmark size={19}/></span><b>Municipio de Bahía Mosca</b></a>
      <div className="nav"><a href="/">Edición 2D</a><button onClick={() => help.current?.showModal()} aria-label="Cómo funciona"><CircleHelp size={18}/></button></div>
    </header>
    <main className="broadcast">
      <div className="program">
        <div><p className="series">Cabo Corruption Simulator</p><h1>Señor Mosca <span>3D</span></h1></div>
        <div className="program-status"><span className="day">Día {day} de {meta?.max_days ?? 10}</span><button type="button" onClick={() => setPaused(p => !p)} disabled={phase==='waiting'||phase==='complete'||phase==='error'}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?'Reanudar':'Pausar'}</button></div>
      </div>

      <div className="broadcast-grid">
        <section className="screen" aria-label="Transmisión del cabildo">
          <Theater activity={{phase,issue:selected,counts:frame?.counts ?? [],results:outcomes}}/>
          <div className="screen-top"><span className="live"><span/> {paused ? 'En pausa' : phase==='complete' ? 'Sesión cerrada' : 'Sesión automática'}</span><span className="location"><Clapperboard size={14}/> Cabildo municipal</span></div>
          <div className="caption" style={{'--district':district.color} as React.CSSProperties}>
            <span>{phase==='ruling' ? 'Señor Mosca · Alcalde' : phase==='complete' ? 'Balance del mandato' : 'Secretaría del cabildo'}</span>
            <p>{phase==='ruling' && last ? '“'+last.result.ruling.quote+'”' : phase==='complete' ? ending : phase==='trial' ? 'El alcalde está deliberando…' : phase==='brief' && brief ? '“'+brief.brief+'”' : 'La sesión se está preparando.'}</p>
          </div>
        </section>

        <section className="dossier" aria-label="Expediente y registro neural">
          <div className="dossier-top">
            <span className="phase" role="status"><Radio size={14}/> {phaseText[phase]}</span>
            <div className="heading-row"><h2>{phase==='complete'?'Fin del mandato':brief?.title ?? 'Expediente municipal'}</h2><div className="stamp" style={{color:district.color}}><district.icon size={24}/></div></div>
            <p className="office">{brief?.office ?? 'Cabildo municipal'}</p>
            <div className="agenda" aria-label="Orden de expedientes">{districtOrder.map(id => {
              const Icon=districts[id].icon
              return <span key={id} title={districts[id].place} aria-current={selected===id ? 'step' : undefined}><Icon size={15}/>{districts[id].name}</span>
            })}</div>
          </div>
          {error && <div className="outcome error-box" role="alert"><p>{error}</p><button onClick={retry}>Reintentar</button></div>}
          {phase==='ruling' && last && <div className="outcome" role="status"><h3>{last.result.ruling.title}</h3><p>{last.result.ruling.consequence}</p></div>}
          {phase==='complete' && <div className="outcome"><p>{ending}</p><button onClick={restart}><RotateCcw size={14}/> Ver otro mandato</button></div>}
          <div className="lab">
            <div className="lab-head"><h3><Activity size={18}/> Registro neural</h3><select aria-label="Modo neural" value={mode} disabled={!meta||phase==='trial'} onChange={e=>setMode(e.target.value as Mode)}><option value="demo">Demo · 21 neuronas</option><option value="flywire" disabled={!meta?.flywire.available}>FlyWire v783</option></select></div>
            <div className="lab-read"><span>{stimulus?.mode==='flywire' || (!stimulus&&mode==='flywire') ? 'Modelo de Shiu' : 'Circuito sintético Brian2'}</span><strong>{frame ? frame.elapsed+' / 300 ms' : phase==='trial' ? 'Preparando…' : '0 / 300 ms'}</strong></div>
            <NeuralPlot events={events} ready={ready} frame={frame}/>
            <div className="scores">{channels.map((channel,i)=><div key={channel}><i style={{background:palette[i]}}/><span>{channel}</span><strong>{frame ? fmt.format(frame.counts[i]) : '—'}</strong></div>)}</div>
            <p className="trace-note">{frame ? `${fmt.format(frame.spikes)} disparos totales · ${fmt.format(frame.active)} neuronas activas.` : 'Los disparos del panel deciden el fallo.'} {ready?.score_until===30 && 'Se puntúan los primeros 30 ms.'}</p>
            {!meta?.flywire.available && meta?.flywire.reason && <details className="mode-detail"><summary>Activar FlyWire</summary>{meta.flywire.reason}</details>}
          </div>
        </section>
      </div>

      <section className="city-strip" aria-label="Estado municipal">
        {measures.map(({id,label,icon:Icon}) => {
          const value = campaign?.city[id]
          const change = last?.result.changes[id]
          const trend = change ? (change>0 ? '+' : '−')+(id==='treasury'?fmt.format(Math.abs(change)/1000)+' M':Math.abs(change)+' pp') : null
          return <div key={id}><Icon size={19}/><span>{label}<b>{value===undefined?'—':id==='treasury'?'$'+fmt.format(value/1000)+' M':value+'%'}</b></span>{trend&&<small>{trend}</small>}</div>
        })}
      </section>
      <section className="decision-log" aria-labelledby="decision-log-title">
        <div className="decision-log-heading">
          <h2 id="decision-log-title">Bitácora de decisiones</h2>
          <span>{campaign?.log.length ?? 0} de {meta?.max_days ?? 10} decisiones</span>
        </div>
        {campaign?.log.length ? <ol>
          {[...campaign.log].reverse().map(entry => <li key={entry.day}>
            <div className="decision-meta">
              <span>Día {entry.day}</span>
              <span>{meta?.issues[entry.issue]?.title ?? districts[entry.issue as District]?.name ?? entry.issue}</span>
              <span>{entry.mode === 'flywire' ? 'FlyWire v783' : 'Demo'}</span>
            </div>
            <h3>{entry.result.ruling.title}</h3>
            <p>“{entry.result.ruling.quote}”</p>
            <p className="decision-consequence">{entry.result.ruling.consequence}</p>
            <div className="decision-changes" aria-label="Cambios en el municipio">
              {measures.map(({id,label}) => {
                const change = entry.result.changes[id]
                const formatted = id === 'treasury' ? '$' + fmt.format(Math.abs(change) / 1000) + ' M' : Math.abs(change) + ' pp'
                return <span key={id}>{label} <b>{change > 0 ? '+' : change < 0 ? '−' : ''}{formatted}</b></span>
              })}
            </div>
          </li>)}
        </ol> : <p className="decision-empty">Las decisiones del alcalde aparecerán aquí al terminar cada expediente.</p>}
      </section>
      <footer><span>Sátira ficticia · Bahía Mosca</span></footer>
    </main>
    <dialog ref={help}>
      <h2>Una sesión automática</h2>
      <p>Los cinco expedientes se presentan por orden. El alcalde se queda sentado y cada resultado actualiza las cuentas del municipio. La sesión dura hasta diez días. Puedes pausarla o cambiar de circuito antes del siguiente ensayo.</p>
      <p>La escena usa los disparos de Brian2 y aplica reglas de juego para elegir el fallo. FlyWire v783 es el conjunto de datos de Shiu. MaleCNS es otro conectoma.</p>
      <form method="dialog"><button>Volver a la sesión</button></form>
    </dialog>
  </>
}

createRoot(document.getElementById('root')!).render(<App/>)
