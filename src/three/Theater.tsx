import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { districtOrder, districts, type District } from './districts'
import { makeHearing, makeLandscape } from './landscape'

export type Phase = 'waiting' | 'brief' | 'trial' | 'ruling' | 'complete' | 'error'
export type StageState = {
  phase: Phase
  issue: District
  counts: number[]
  results: Partial<Record<District, number | null>>
}

function animateWings(wings: T.Group[], time: number, strength: number) {
  wings.forEach((wing,i) => {
    wing.rotation.z = (i===0?-1:1)*Math.sin(time*16)*strength
  })
}

export function Theater({activity}: {activity: StageState}) {
  const surface = useRef<HTMLCanvasElement>(null)
  const latest = useRef(activity)
  const [available, setAvailable] = useState(true)

  useEffect(() => { latest.current = activity }, [activity])
  useEffect(() => {
    const canvas = surface.current!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({canvas, antialias: true, powerPreference:'high-performance'})
    } catch {
      setAvailable(false)
      return
    }

    const scene = new T.Scene()
    scene.background = new T.Color('#e1bca0')
    scene.fog = new T.FogExp2('#e3c4a8',.0135)
    const camera = new T.OrthographicCamera(-15,15,8,-8,.1,180)
    camera.position.set(7.3,9.7,23)
    camera.lookAt(1.55,2.1,-5.6)
    scene.add(new T.HemisphereLight('#fff0d5','#89a39a',1.76))
    const sun = new T.DirectionalLight('#ffdaa3',2.53)
    sun.position.set(-18,31,18)
    sun.target.position.set(0,0,-7)
    sun.castShadow = true
    sun.shadow.camera.left = -27
    sun.shadow.camera.right = 27
    sun.shadow.camera.top = 25
    sun.shadow.camera.bottom = -27
    sun.shadow.normalBias = .04
    sun.shadow.mapSize.set(1024,1024)
    scene.add(sun,sun.target)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02

    const town = makeLandscape(scene)
    const hearing = makeHearing(scene)
    const start = new T.Vector3(7.3,.26,3.35)
    const finish = new T.Vector3(2.92,.26,1.78)
    let phase: Phase | undefined
    let changedAt = 0
    let previousFrame = 0
    let animation = 0
    let disposed = false

    function resize() {
      const width = Math.max(1,canvas.clientWidth)
      const height = Math.max(1,canvas.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5))
      renderer.setSize(width,height,false)
      const aspect = width / height
      const vertical = Math.max(5.75,9.7/aspect)
      camera.left = -vertical*aspect
      camera.right = vertical*aspect
      camera.top = vertical
      camera.bottom = -vertical
      camera.updateProjectionMatrix()
    }

    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas)
    resize()
    const fallback = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(animation)
      setAvailable(false)
    }
    canvas.addEventListener('webglcontextlost',fallback)

    function draw(now: number) {
      if (disposed) return
      animation = requestAnimationFrame(draw)
      if (now-previousFrame < 31) return
      previousFrame = now
      const seconds = now/1000
      const {phase:nextPhase, issue, counts, results} = latest.current
      if (phase !== nextPhase) {
        phase = nextPhase
        changedAt = seconds
        renderer.shadowMap.needsUpdate = true
      }
      const t = Math.min(1,(seconds-changedAt)/1.65)
      const eased = t*t*(3-2*t)
      const visitorPosition = phase === 'brief' ? eased : phase === 'trial' ? 1 :
        phase === 'ruling' ? 1-Math.max(0,(eased-.36)/.64) : 0
      hearing.visitor.root.position.lerpVectors(start,finish,reduced ? Number(visitorPosition > .5) : visitorPosition)
      hearing.visitor.root.rotation.y = phase==='ruling' && visitorPosition<.75 ? 1.06 : -.99
      hearing.visitor.figure.position.y = reduced ? 0 : Math.sin(seconds*16)*.052*(t<1?1:.25)
      const flyMotion = phase === 'trial' ? .17 : phase === 'ruling' ? .09 : .035
      animateWings(hearing.mayor.wings,seconds,reduced?0:flyMotion)
      animateWings(hearing.visitor.wings,seconds,reduced?0:.17)
      hearing.mayor.figure.rotation.x = reduced ? 0 : Math.sin(seconds*2.4)*(phase==='ruling'?.065:.025)
      hearing.folder.material.color.set(districts[issue].color)
      hearing.lamps.forEach((lamp,index) => {
        const count = counts[index] ?? 0
        lamp.material.emissiveIntensity = .08+Math.min(2.2,Math.log1p(count)*.43)
        lamp.scale.setScalar(.107+Math.min(.047,Math.log1p(count)*.011))
      })
      for (const id of districtOrder) {
        town.beacons[id].material.opacity = issue===id ? .82 : .29
        const outcome = results[id]
        town.aftermath[id].forEach((object,i) => { object.visible = outcome !== undefined && i===(outcome??3) })
      }
      if (!reduced) town.boats.forEach((boat,index) => {
        boat.position.y = .19+Math.sin(seconds*1.15+index)*.083
        boat.rotation.z = Math.sin(seconds*.88+index)*.053
      })
      renderer.render(scene,camera)
    }
    animation = requestAnimationFrame(draw)
    return () => {
      disposed = true
      cancelAnimationFrame(animation)
      sizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost',fallback)
      scene.traverse(object => {
        if (!(object instanceof T.Mesh)) return
        object.geometry.dispose()
        for (const material of Array.isArray(object.material)?object.material:[object.material]) {
          if ('map' in material && material.map instanceof T.Texture) material.map.dispose()
          material.dispose()
        }
      })
      sun.shadow.dispose()
      renderer.dispose()
    }
  }, [])

  return <div className="theater">
    <canvas ref={surface} data-testid="hearing-canvas" aria-label="Escena 3D del alcalde mosca sentado en su escritorio"/>
    {!available && <p className="graphics-note" role="status">WebGL 2 no está disponible. Los expedientes siguen por escrito.</p>}
  </div>
}
