import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CircleHelp, ClipboardCheck, Droplets, FileSearch, Landmark, Megaphone, Radio, RotateCcw, ShieldAlert, Users, Wallet } from 'lucide-react'
import { consume, type Bootstrap, type Campaign, type City, type Frame, type Mode, type Ready, type Stimulus } from './protocol'
import './style.css'

const icons = {water: Droplets, contract: Building2, hotel: Landmark, audit: FileSearch, protest: Megaphone}
const order = ['water', 'contract', 'hotel', 'audit', 'protest'] as (keyof typeof icons)[]
const focusOptions = [{id:'neutral', label:'Sin énfasis'}, {id:'citizens',label:'Vecindario'}, {id:'business',label:'Inversión'}, {id:'audit',label:'Contraloría'}]
const metrics = [{id:'treasury', label:'Tesorería', icon:Wallet}, {id:'corruption', label:'Corrupción', icon:ShieldAlert}, {id:'satisfaction', label:'Aprobación', icon:Users}, {id:'audit', label:'Presión de auditoría', icon:ClipboardCheck}] as const
const channels = ['Comunidad', 'Mercado', 'Vigilancia']
const colors = ['#9cdcae', '#f1b85b', '#eda39a']
const fmt = new Intl.NumberFormat('es-MX')
const key = 'senor-mosca-campaign-v1'

function prior(initial: City): Campaign {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Campaign | null
    if (saved && Array.isArray(saved.log) && saved.city && saved.city.day === saved.log.length+1) return saved
  } catch { /* optional browser storage */ }
  return {city: initial, log: []}
}

function Raster({events, elapsed, duration, scoreUntil, panelSize}: {events: Frame['events']; elapsed: number; duration: number; scoreUntil: number; panelSize: number}) {
  const x = (ms: number) => 19 + 562*ms/duration
  return <svg className="raster" viewBox="0 0 600 141" role="img" aria-label={`Raster de ${panelSize*3} neuronas observadas; ${events.length} disparos registrados en el panel`}>
    {[0, 1, 2].map(i => <rect key={i} x="19" y={11+i*34} width="562" height="30" fill={colors[i]} opacity=".075"/>)}
    {[0, .25, .5, .75, 1].map(t => <g key={t}><path d={`M${x(t*duration)} 8v105`} stroke="#aac2ab" strokeOpacity=".23" strokeDasharray={t ? '2 4' : undefined}/><text x={x(t*duration)} y="132" textAnchor={t===0?'start':t===1?'end':'middle'}>{t*duration} ms</text></g>)}
    {scoreUntil < duration && <rect x={x(0)} y="8" width={x(scoreUntil)-x(0)} height="105" fill="#ffde91" opacity=".1"/>}
    {events.map(([lane,t],i) => {
      const row = Math.floor(lane/panelSize)
      const y = 14 + row*34 + (lane%panelSize) * 26/panelSize
      return <path key={i} d={`M${x(t)} ${y}v3`} stroke={colors[row]} strokeWidth="2" strokeLinecap="round"/>
    })}
    {elapsed > 0 && <path d={`M${x(elapsed)} 8v105`} stroke="#f4e6be" strokeOpacity=".75"/>}
    {!events.length && <text x="300" y="63" textAnchor="middle" className="raster-empty">{elapsed ? 'Sin disparos en el panel todavía' : 'El registro aparece al presentar un expediente'}</text>}
  </svg>
}

function App() {
  const [meta, setMeta] = useState<Bootstrap | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [issue, setIssue] = useState<(typeof order)[number]>('water')
  const [focus, setFocus] = useState('neutral')
  const [mode, setMode] = useState<Mode>('demo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [ready, setReady] = useState<Ready | null>(null)
  const [stimulus, setStimulus] = useState<Stimulus | null>(null)
  const [events, setEvents] = useState<Frame['events']>([])
  const help = useRef<HTMLDialogElement>(null)
  const active = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/bootstrap', {signal: controller.signal}).then(r => {
      if (!r.ok) throw Error()
      return r.json() as Promise<Bootstrap>
    }).then(data => {
      setMeta(data)
      setCampaign(prior(data.state))
    }).catch(() => { if (!controller.signal.aborted) setError('El servidor local no responde. Inícialo y recarga la página.') })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (campaign) try {sessionStorage.setItem(key, JSON.stringify(campaign))} catch { /* storage is optional */ }
  }, [campaign])

  const last = campaign?.log.at(-1)
  const ending = last?.result.ending
  const selected = meta?.issues[issue]
  const selectedMode = stimulus?.mode ?? mode
  function clearTrial() {setFrame(null); setReady(null); setEvents([]); setStimulus(null); setError('')}
  function restart() {
    if (!meta || active.current) return
    clearTrial(); setCampaign({city:meta.state, log:[]}); setIssue('water'); setFocus('neutral')
  }
  async function run() {
    if (!campaign || active.current || ending) return
    const current = campaign
    active.current = true; setBusy(true); clearTrial()
    try {
      const response = await fetch('/api/turn', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({issue, focus, mode, state:current.city})
      })
      await consume(response, event => {
        if (event.type === 'stimulus') setStimulus(event)
        if (event.type === 'ready') setReady(event)
        if (event.type === 'frame') {setFrame(event); setEvents(old => [...old, ...event.events])}
        if (event.type === 'result') setCampaign({city:event.state, log:[...current.log, {day:current.city.day, issue, mode, result:event}]})
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La simulación no está disponible.')
    } finally { active.current = false; setBusy(false) }
  }

  return <>
    <header className="top">
      <div className="wrap top-inner">
        <a className="brand" href="#inicio"><span className="crest"><Landmark size={19}/></span> Municipio de Bahía Mosca</a>
        <div className="edition-links"><a href="/3d/">Edición 3D</a><button className="guide" onClick={() => help.current?.showModal()}><CircleHelp size={16}/> Cómo jugar</button></div>
      </div>
    </header>
    <main id="inicio">
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-text">
            <div className="edition"><Activity size={16}/> FlyWire Brain Edition</div>
            <h1>Señor Mosca</h1>
            <p className="subtitle">Cabo Corruption Simulator</p>
            <p className="tagline">Tú presentas el problema. Los disparos deciden qué anuncia el alcalde.</p>
          </div>
          <img className="portrait" src="./mayor.svg" alt="El alcalde ficticio, una mosca de traje, ante el puerto y el micrófono municipal"/>
          <span className="figure-label">Fig. 01 · El alcalde</span>
        </div>
      </section>
      <div className="wrap">
        <section className="stats" aria-label="Estado municipal">
          {metrics.map(({id, label, icon:Icon}) => {
            const value = campaign?.city[id]
            const change = last?.result.changes[id] ?? 0
            return <div className="stat" key={id}><Icon size={19}/><div>
              <span className="metric-label">{label}</span>
              <div className="metric-value">{value === undefined ? '—' : id==='treasury' ? '$'+fmt.format(value/1000)+' M' : value+'%'}</div>
            </div>{change!==0 && <span className={`trend ${(id==='corruption'||id==='audit' ? change<0 : change>0) ? 'good' : 'bad'}`}>{change>0?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {id==='treasury' ? fmt.format(Math.abs(change)/1000)+' M' : Math.abs(change)+' pp'}</span>}</div>
          })}
        </section>
        {error && <p className="alert" role="alert">{error}</p>}
        {ending && <div className="ending" role="status"><div><b>Fin del mandato</b><p>{ending}</p></div><button className="secondary" onClick={restart}><RotateCcw size={16}/> Nuevo mandato</button></div>}
        <div className="board">
          <section className="docket" aria-labelledby="docket-title">
            <div className="section-row"><h2 id="docket-title">Mesa de cabildo</h2><span className="day-pill">Día {Math.min(campaign?.city.day ?? 1, meta?.max_days ?? 10)} / {meta?.max_days ?? 10}</span></div>
            <p className="section-note">Elige el siguiente expediente.</p>
            <div className="issues" role="group" aria-label="Expedientes">
              {order.map((id,i) => {
                const card = meta?.issues[id]
                const Icon = icons[id]
                return <button key={id} className="issue" aria-pressed={issue===id} disabled={!meta||busy||!!ending} onClick={()=>setIssue(id)}>
                  <span className="issue-icon"><Icon size={19}/></span><span className="issue-title"><strong>{card?.title ?? 'Expediente '+(i+1)}</strong><small>{card?.office ?? 'Cargando'}</small></span><ArrowRight size={17} className="issue-arrow"/>
                </button>
              })}
            </div>
          </section>
          <section aria-labelledby="brief-title" className="session">
            <div className="brief">
              <div className="brief-top"><span className="file-ref">Expediente {String(order.indexOf(issue)+1).padStart(2,'0')}</span><span>{selected?.office}</span></div>
              <h2 id="brief-title">{selected?.title ?? 'Cargando expediente…'}</h2>
              <p>{selected?.brief}</p>
              <div className="controls">
                <label htmlFor="focus">Énfasis del informe<select id="focus" value={focus} disabled={busy||!!ending} onChange={e=>setFocus(e.target.value)}>{focusOptions.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
                <button className="primary" onClick={run} disabled={!campaign||busy||!!ending}>{busy?'Ensayo en curso…':'Presentar expediente'}<ArrowRight size={18}/></button>
              </div>
            </div>
            <div className="neural" aria-labelledby="neural-title">
              <div className="neural-head"><div><div className="scope-label"><Radio size={14}/> Registro del laboratorio</div><h2 id="neural-title">Actividad neural</h2></div>
              <label className="mode">Modo<select aria-label="Modo neural" value={mode} disabled={busy} onChange={e=>{setMode(e.target.value as Mode);clearTrial()}}><option value="demo">Demo · 21 neuronas</option><option value="flywire" disabled={!meta?.flywire.available}>FlyWire v783{meta?.flywire.available ? '' : ' · sin instalar'}</option></select></label></div>
              <div className="scope-info">
                <span>{selectedMode==='demo' ? 'Circuito sintético Brian2' : 'Conectoma v783 · modelo Shiu'}</span><strong role="status">{busy && !ready ? 'Preparando circuito…' : frame ? `${frame.elapsed} / ${ready?.duration ?? 300} ms` : 'En espera'}</strong>
              </div>
              <Raster events={events} elapsed={frame?.elapsed ?? 0} duration={ready?.duration ?? 300} scoreUntil={ready?.score_until ?? 300} panelSize={ready?.panel_size ?? 6}/>
              <div className="channels">{channels.map((name,i)=><div key={name}><span className="dot" style={{background:colors[i]}}/><span>{name}<small>{stimulus ? stimulus.rates[i]+' Hz de entrada' : 'Panel '+(i+1)}</small></span><strong>{frame ? fmt.format(frame.counts[i]) : '—'}</strong></div>)}</div>
              <p className="scope-foot">{frame ? `${fmt.format(frame.spikes)} disparos totales · ${fmt.format(frame.active)} de ${fmt.format(ready?.neurons ?? 0)} neuronas activas. ` : 'Cada marca es un disparo medido. '}{ready && ready.score_until < ready.duration ? `La decisión usa los primeros ${ready.score_until} ms (franja sombreada). ` : ''}Los paneles no representan ideas políticas.</p>
              {!meta?.flywire.available && meta?.flywire.reason && <details className="lab-details"><summary>Cómo activar FlyWire</summary>{meta.flywire.reason}</details>}
              {ready?.root_ids && <details className="lab-details"><summary>Identificadores FlyWire del raster</summary>{ready.root_ids.map((ids,i)=><p key={i}>{channels[i]}: {ids.join(', ')}</p>)}</details>}
            </div>
          </section>
          <section className="press" aria-labelledby="press-title">
            <div className="section-row"><h2 id="press-title"><Megaphone size={21}/> Sala de prensa</h2><span className="day-pill">{last ? 'Comunicado '+String(last.day).padStart(2,'0') : 'Sin comunicados'}</span></div>
            <div aria-live="polite">
              {last ? <div className="announcement"><h3>{last.result.ruling.title}</h3><blockquote>“{last.result.ruling.quote}”</blockquote><p>{last.result.ruling.consequence}</p></div> :
                <p className="section-note">El alcalde hablará cuando termine el primer ensayo.</p>}
            </div>
            {campaign && campaign.log.length > 0 && <details className="archive"><summary>Ver bitácora ({campaign.log.length})</summary><ol>{[...campaign.log].reverse().map(entry=><li key={entry.day}><b>Día {entry.day} · {meta?.issues[entry.issue]?.title}</b><span>{entry.result.ruling.title} · {entry.mode==='demo'?'Demo':'FlyWire v783'}</span>{metrics.map(m=><small key={m.id}>{m.label}: {m.id==='treasury' ? fmt.format(entry.result.changes[m.id]/1000)+' M' : (entry.result.changes[m.id]>0?'+':'')+entry.result.changes[m.id]+' pp'}</small>)}</li>)}</ol></details>}
          </section>
        </div>
        <footer><span>Bahía Mosca y sus personajes son ficticios. Sátira municipal.</span>{campaign && campaign.log.length>0 && !ending && <button className="guide reset" onClick={restart} disabled={busy}><RotateCcw size={14}/> Reiniciar mandato</button>}</footer>
      </div>
    </main>
    <dialog ref={help} aria-labelledby="help-title">
      <h2 id="help-title">Cómo jugar</h2>
      <ol><li>Elige un expediente cada día. Puedes elegir qué urgencia subrayar en el informe.</li><li>Presenta el expediente. El panel con más disparos selecciona la respuesta; un empate o silencio aplaza el fallo.</li><li>Lee el comunicado y vigila la tesorería, la aprobación y la contraloría. El mandato dura hasta diez días.</li></ol>
      <p>El modo demo usa un circuito sintético de 21 neuronas. FlyWire usa el conectoma v783 con el modelo de Shiu et al. Los estímulos y la lectura política son reglas del juego, sin significado biológico validado.</p>
      <form method="dialog"><button className="primary">Volver al cabildo</button></form>
    </dialog>
  </>
}

createRoot(document.getElementById('root')!).render(<App/>)
