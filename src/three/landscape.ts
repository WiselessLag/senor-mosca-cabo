import * as T from 'three'
import { districts, districtOrder, type District } from './districts'

const block = new T.BoxGeometry()
const orb = new T.SphereGeometry(1, 12, 8)
const cone = new T.ConeGeometry(1, 1, 5)
const tube = new T.CylinderGeometry(1, 1, 1, 12)
const materials = new Map<string, T.MeshStandardMaterial>()
const palette = {
  sea: '#358b94', sand: '#d6ad7b', plaster: '#efcc98', wall: '#ead9a8',
  shade: '#695649', roof: '#a44e37', window: '#315457', road: '#94867a', curb: '#c0a488',
  palm: '#3e7954', clay: '#d98a5d', cream: '#ffedbf', stone: '#ae7b54',
}

function shape(parent: T.Object3D, geometry: T.BufferGeometry, color: string,
               x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  let material = materials.get(color)
  if (!material) {
    material = new T.MeshStandardMaterial({color, flatShading: true, roughness: .9})
    materials.set(color, material)
  }
  const mesh = new T.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.scale.set(sx, sy, sz)
  mesh.receiveShadow = true
  mesh.castShadow = true
  parent.add(mesh)
  return mesh
}
const box = (p: T.Object3D, c: string, x: number, y: number, z: number, w: number, h: number, d: number) => shape(p, block, c, x, y, z, w, h, d)
const ball = (p: T.Object3D, c: string, x: number, y: number, z: number, w: number, h: number, d: number) => shape(p, orb, c, x, y, z, w, h, d)
const cylinder = (p: T.Object3D, c: string, x: number, y: number, z: number, radius: number, height: number) => shape(p, tube, c, x, y, z, radius, height, radius)

function group(parent: T.Object3D, x: number, y: number, z: number) {
  const node = new T.Group()
  node.position.set(x,y,z)
  parent.add(node)
  return node
}

function label(parent: T.Object3D, caption: string, width: number, x: number, y: number, z: number) {
  const surface = document.createElement('canvas')
  surface.width = 512
  surface.height = 96
  const ctx = surface.getContext('2d')!
  ctx.fillStyle = '#254648'
  ctx.fillRect(0,0,512,96)
  ctx.strokeStyle = '#eac487'
  ctx.lineWidth = 4
  ctx.strokeRect(6,6,500,84)
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff1ca'
  ctx.fillText(caption,256,48,470)
  const texture = new T.CanvasTexture(surface)
  texture.colorSpace = T.SRGBColorSpace
  const mesh = new T.Mesh(new T.PlaneGeometry(width, width*96/512), new T.MeshBasicMaterial({map:texture}))
  mesh.position.set(x,y,z)
  parent.add(mesh)
}

function facade(parent: T.Object3D, x: number, z: number, w: number, d: number, h: number, color: string,
                caption?: string, roof = palette.roof) {
  const b = group(parent,x,0,z)
  box(b,palette.curb,0,.14,0,w+.8,.28,d+.8)
  box(b,color,0,h/2+.2,0,w,h,d)
  box(b,roof,0,h+.2,0,w+.55,.45,d+.5)
  box(b,palette.cream,0,h+.58,0,w+.3,.24,d+.21)
  const cols = Math.max(2,Math.floor(w/2.3))
  for (let col=0; col<cols; col++) {
    const wx = (col+.5)*w/cols-w/2
    for (let row=0; row<Math.floor(h/1.75); row++) {
      const center = col === Math.floor(cols/2) && row === 0
      const wy = center ? .88 : 1.42+row*1.7
      box(b,palette.cream,wx,wy,d/2+.055,1.23,center?1.74:1.08,.15)
      box(b,palette.window,wx,wy,d/2+.15,.94,center?1.55:.8,.14)
      if (!center) box(b,roof,wx,wy-.52,d/2+.18,1.27,.13,.38)
    }
  }
  for (const side of [-1,1]) {
    for (let row=0; row<Math.floor(h/1.75); row++) {
      for (let j=0; j<Math.floor(d/2); j++) {
        box(b,palette.window,side*(w/2+.04),1.4+1.7*row,-d/2+1.25+j*1.7,.1,.75,.76)
      }
    }
  }
  if (caption) label(b,caption,Math.min(w*.81,7),0,.45+h,d/2+.3)
  return b
}

function palm(parent: T.Object3D, x: number, z: number, height: number, phase: number) {
  const p = group(parent,x,0,z)
  const stem = cylinder(p,'#916740',.25,height*.48,0,.19,height)
  stem.rotation.z = -.12
  for (let i=0; i<7; i++) {
    const angle = i*Math.PI*2/7+phase
    const leaf = ball(p,i%2 ? '#4f8a56' : '#34684c',.5+Math.cos(angle)*.8,height+.04,Math.sin(angle)*.8,1.12,.12,.33)
    leaf.rotation.y = -angle
    leaf.rotation.z = -.17
  }
  ball(p,'#7da462',.48,height+.15,0,.5,.26,.46)
}

function tank(parent: T.Object3D, x: number, z: number, color: string) {
  const node = group(parent,x,0,z)
  for (const a of [-1.03,1.03]) for (const b of [-1.03,1.03]) box(node,palette.window,a,1.5,b,.23,3,.23)
  cylinder(node,color,0,3.1,0,1.6,1.8)
  ball(node,'#d1e7db',0,4,0,1.62,.35,1.62)
  cylinder(node,palette.window,0,2.25,0,1.64,.17)
}

function vehicle(parent: T.Object3D, x: number, z: number, color: string, tanker = false) {
  const n = group(parent,x,0,z)
  box(n,'#284648',0,.35,0,2.4,.42,1.14)
  box(n,color,.7,.84,0,.95,.86,1.1)
  box(n,'#a8e1da',.73,1.02,.566,.68,.28,.025)
  if (tanker) {
    const vat = cylinder(n,'#a8dfdf',-.43,.91,0,.51,1.65)
    vat.rotation.z = Math.PI/2
  } else box(n,color,-.45,.7,0,1.05,.45,1.08)
  for (const wx of [-.73,.76]) for (const wz of [-.59,.59]) {
    cylinder(n,'#303436',wx,.31,wz,.28,.15).rotation.x = Math.PI/2
  }
  return n
}

export function fly(parent: T.Object3D, color: string, mayor = false) {
  const root = group(parent,0,0,0)
  const figure = group(root,0,0,0)
  const wings = [-1,1].map(side => {
    const wing = group(figure,side*.39,1.03,-.14)
    const blade = ball(wing,'#b1e7dd',side*.57,.02,-.3,.85,.085,.34)
    blade.rotation.y = side*.32
    return wing
  })
  ball(figure,color,0,.83,0,.47,.61,.42)
  ball(figure,'#4b6044',0,1.54,.11,.47,.43,.43)
  for (const side of [-1,1]) {
    ball(figure,'#ab4d39',side*.29,1.58,.41,.23,.28,.19)
    ball(figure,'#e48855',side*.31,1.68,.53,.077,.092,.042)
    const antenna = cylinder(figure,'#3a4637',side*.24,1.94,.13,.027,.43)
    antenna.rotation.z = -side*.36
    ball(figure,'#3a4637',side*.31,2.13,.13,.072,.071,.071)
    box(figure,'#283f40',side*.22,.21,.07,.13,.42,.18)
  }
  const stripe = box(figure,mayor?'#e47541':'#e9bf67',0,.83,.399,.18,.86,.05)
  stripe.rotation.z = mayor ? -.58 : .46
  return {root,figure,wings}
}

function boat(parent: T.Object3D, x: number, z: number, color: string, angle: number) {
  const n = group(parent,x,.18,z)
  n.rotation.y = angle
  ball(n,color,0,0,0,.71,.23,1.52)
  ball(n,palette.cream,0,.13,0,.55,.09,1.28)
  box(n,palette.window,0,.22,.09,.48,.16,.65)
  cylinder(n,palette.cream,0,.72,0,.027,1.4)
  const sail = shape(n,cone,'#f8dfac',.14,.86,-.12,.49,1.08,.53)
  sail.rotation.y = Math.PI*.36
  return n
}

export type WorldResult = {district: District; winner: number | null}
export function makeLandscape(scene: T.Scene) {
  const terrain = group(scene,0,0,0)
  const ocean = box(scene,palette.sea,0,-.27,63,330,.18,215)
  ocean.castShadow = false
  box(terrain,palette.sand,0,-.63,-27,110,1.24,86)
  box(terrain,'#c19970',0,-.28,14.8,94,.56,1.42)
  box(terrain,'#e0c299',0,.02,13.9,94,.08,1.08)
  box(terrain,'#b4a28a',0,.04,10.9,87,.08,3.7)
  box(terrain,palette.road,0,.025,-5,71,.06,5)
  box(terrain,palette.road,5,.025,-11,6,.06,48)
  box(terrain,palette.road,-24,.025,-12,4,.06,44)
  box(terrain,palette.road,23,.025,-15,3.7,.06,42)
  box(terrain,'#c9a57b',1,.08,4,19,.16,10)
  for (let i=0;i<35;i++) {
    box(terrain,'#d4bc99',i*2-34,.071,-5,.96,.015,.08)
    box(terrain,'#cfb18a',i*2-34,.101,11.1,.09,.015,3.4)
  }
  for (let i=0;i<16;i++) {
    const dx = i%8*6.9-26
    const dz = -34-Math.floor(i/8)*8
    facade(terrain,dx,dz,4.8+(i%3)*.5,4.6,2.6+(i*7%5)*.71,
           ['#d3a376','#d9bc91','#c99272','#d9c49c'][i%4])
  }
  const hills = ['#a17566','#b68772','#bd9277','#c39b81','#b17f68']
  for (let i=0;i<12;i++) {
    const x = i*14-79
    const peak = new T.ConeGeometry(1,1,5)
    const hill = shape(terrain,peak,hills[i%5],x,1,-66+(i%3)*5,15+(i%3)*4,15+(i*7%8),16)
    hill.rotation.y = i*.77
    hill.castShadow = false
  }
  const hall = facade(terrain,3.1,-17,11,7,7.2,'#f1d5a0', 'PALACIO MUNICIPAL','#b5744e')
  for (const side of [-1,1]) {
    box(hall,palette.cream,side*4.4,2.75,4.05,.44,5.1,.51)
    box(hall,palette.clay,side*4.4,.35,4.03,.78,.28,.75)
  }
  box(hall,palette.cream,0,7.75,0,5.4,1.28,4.7)
  box(hall,palette.roof,0,8.56,0,5.6,.23,4.88)
  cylinder(hall,'#554c3f',0,9.42,0,.05,1.8)
  box(hall,'#78a37d',.48,9.94,0,.91,.52,.06)
  box(hall,palette.cream,0,.21,4.58,6,.35,2.05)
  box(hall,'#c09d78',0,.12,5.48,6.35,.2,.9)
  facade(terrain,-28,-7,7.1,5.1,3.3,'#c4d8c5','ESTACIÓN DE AGUA','#638877')
  tank(terrain,-26,0,'#77b7bd')
  tank(terrain,-29.7,-.7,'#8cbac0')
  facade(terrain,-14,-17,7,5.2,3.5,'#dcad81','OBRAS PÚBLICAS')
  const crane = group(terrain,-21,0,-17)
  box(crane,'#b1823e',0,3.7,0,.38,7.4,.38)
  box(crane,'#d8a14b',2.4,7.44,0,7.6,.25,.36)
  box(crane,'#574f48',5.8,5.6,0,.045,3.5,.055)
  box(crane,'#574f48',5.8,3.83,0,.43,.15,.45)
  for (let i=0;i<4;i++) box(crane,'#a97642',.16,1.3+i*1.6,0,.9,.12,.24)
  facade(terrain,20,-18,9.4,7.3,8.2,'#e3b78b','HOTEL MIRADOR','#90725f')
  facade(terrain,27,-22,6.1,5.3,5.6,'#dca57f',undefined,'#8d725d')
  facade(terrain,29,-3.7,6.3,6.1,4.6,'#e8c0a4','CONTRALORÍA','#966656')
  facade(terrain,-13,5,4.6,4.2,2.7,'#dc9b70','MERCADO')
  facade(terrain,13,3,4.8,4.1,2.55,'#c7c98b','MALECÓN','#8b774e')
  const plaza = group(terrain,-1,0,4)
  cylinder(plaza,'#9d7f65',0,.2,0,2.07,.34)
  cylinder(plaza,'#5b9da1',0,.38,0,1.7,.09)
  cylinder(plaza,'#e3c099',0,.61,0,.21,.65)
  ball(plaza,'#91c7c2',0,.95,0,.29,.2,.3)
  for (const x of [-7.8,8.2]) for (const z of [.2,7.4]) {
    palm(plaza,x,z-3.6,3.35,(x+z)/6)
    box(plaza,'#845842',x,.24,z-2.1,1.8,.33,.6)
  }
  for (let i=0;i<12;i++) palm(terrain,i*6.8-36,12.1+(i%2)*.7,3.1+i%3*.65,i/3)
  for (let i=0;i<7;i++) palm(terrain,i*9-29,-24+(i%2)*1.5,3.4+i%2*.55,i)
  for (const x of [-14,17.8]) {
    box(terrain,'#aa7955',x,.06,19.9,2.65,.22,10.6)
    for (let i=0;i<11;i++) {
      box(terrain,'#c2956b',x,.184,15.13+i*.89,2.63,.042,.83)
      for (const delta of [-1.18,1.18]) if (i%3===0) box(terrain,'#926548',x+delta,.19,15+i*.9,.18,.96,.19)
    }
  }
  const boats = [boat(scene,-18,21,'#c66c4e',.15),boat(scene,22,22,'#dfa45b',-.15),boat(scene,5,27,'#a9c27e',.56),boat(scene,33,30,'#bd7551',-.5)]
  for (let i=0;i<96;i++) {
    const x=(i*197%1009)/9-55
    const z=15+(i*61%271)/7
    const ripple = box(scene,i%3===0?'#79bab3':'#539fa5',x,-.17,z,.44+(i%6)*.27,.014,.105)
    ripple.castShadow = false
  }
  const beacons = {} as Record<District,T.Mesh<T.RingGeometry,T.MeshBasicMaterial>>
  const aftermath = {} as Record<District,T.Group[]>
  for (const id of districtOrder) {
    const spot = districts[id]
    const ring = new T.Mesh(new T.RingGeometry(1.47,1.61,32),
      new T.MeshBasicMaterial({color:spot.color,transparent:true,opacity:.85,side:T.DoubleSide}))
    ring.rotation.x = -Math.PI/2
    ring.position.set(spot.x,.17,spot.z)
    scene.add(ring)
    beacons[id] = ring
    aftermath[id] = Array.from({length:4},(_,i)=> {
      const marker = group(terrain,spot.x+.9,.03,spot.z-1.95)
      marker.visible = false
      const color = ['#62b284','#d87450','#dfb85d','#a899a5'][i]
      if (id==='water') vehicle(marker,0,0,color,i===0 || i===1)
      if (id==='contract' || id==='hotel') {
        for (let k=0;k<3;k++) {
          shape(marker,cone,color,k*.65-1,.43,0,.24,.85,.24)
          box(marker,palette.cream,k*.65-1,.042,0,.46,.08,.46)
        }
        if (i===1) box(marker,color,-.36,.56,0,2,.25,.13)
      }
      if (id==='audit') {
        box(marker,'#806c50',0,.49,0,1.42,.95,.72)
        for (let k=0;k<3;k++) box(marker,color,k*.39-.38,1,0,.34,.16,.57)
      }
      if (id==='protest') {
        for (let k=0;k<3;k++) {
          const citizen = fly(marker,color)
          citizen.root.position.set(k*.88-.9,0,k%2*.4)
          citizen.root.scale.setScalar(.51)
          box(marker,color,k*.88-.9,.98,0,.62,.42,.05)
        }
      }
      return marker
    })
  }
  return {boats,beacons,aftermath}
}

export function makeHearing(scene: T.Scene) {
  const stage = group(scene,2,0,-4)
  box(stage,'#b48d72',0,.06,0,16.8,.2,9)
  box(stage,'#e8c397',0,.19,0,16.2,.12,8.55)
  box(stage,'#a45c47',.35,.264,1.25,11,.035,5.3)
  box(stage,'#dbad6d',.35,.287,3.72,10.95,.012,.091)
  box(stage,'#dbad6d',.35,.287,-1.22,10.95,.012,.091)

  const seat = group(stage,-2.65,.28,-1.75)
  box(seat,'#864e3f',0,1.22,-.5,1.79,2.29,.29)
  box(seat,'#37615b',0,1.46,-.323,1.52,1.71,.15)
  box(seat,'#d29b68',0,2.45,-.47,1.93,.25,.37)
  box(seat,'#39645b',0,.47,.015,1.65,.29,1.17)
  for (const side of [-1,1]) {
    box(seat,'#704838',side*.73,.45,.22,.17,.87,.19)
    box(seat,'#a06e50',side*.79,.89,.12,.28,.2,1.16)
  }
  const mayor = fly(seat,'#294a4d',true)
  mayor.root.position.set(0,.43,.21)
  mayor.root.scale.set(1.22,1,1.22)
  mayor.root.rotation.y = .25
  const desk = group(stage,-2.5,.26,.38)
  box(desk,'#8d5442',0,.71,0,4.45,1.42,1.55)
  box(desk,'#aa6e4e',0,.74,.79,4.22,1.11,.13)
  box(desk,'#ba7b55',0,1.49,0,4.8,.19,1.76)
  box(desk,'#e2ba79',0,1.59,.01,4.7,.06,1.65)
  label(desk,'SEÑOR MOSCA',2.23,0,1.82,.58)
  for (const x of [-1.62,1.44]) {
    cylinder(desk,'#374345',x,1.66,-.12,.16,.09)
    const mic = cylinder(desk,'#394748',x,1.88,-.12,.04,.47)
    mic.rotation.z = -.2
    ball(desk,'#495656',x+.055,2.09,-.12,.1,.11,.1)
  }
  const folder = box(desk,'#e0a653',.75,1.65,.14,1,.068,.7)
  folder.rotation.y = -.32
  box(desk,'#fff0ca',.77,1.693,.15,.67,.026,.5).rotation.y = -.32

  const lectern = group(stage,2.05,.26,1.15)
  lectern.rotation.y = -.66
  box(lectern,'#294f52',0,.57,0,1.14,1.14,.62)
  box(lectern,'#5e8980',0,.68,.32,.93,.68,.06)
  box(lectern,'#c99766',0,1.16,0,1.57,.20,1.01)
  box(lectern,'#ede0b5',0,1.28,0,.91,.055,.65)
  const visitor = fly(stage,'#be744f')
  visitor.root.position.set(6.2,.24,3.2)
  visitor.root.rotation.y = -1.02
  const document = box(visitor.figure,'#ffeec1',-.02,.85,.54,.71,.075,.46)
  document.rotation.z = -.13

  const machine = group(stage,-5.62,.26,-.2)
  box(machine,'#2a464b',0,.49,0,1.12,1,.97)
  box(machine,'#447775',0,1.07,0,1.25,.17,1.04)
  const lamps = ['#93e8c1','#fac771','#f3a595'].map((color,i) => {
    const lamp = new T.Mesh(orb,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.1,roughness:.33}))
    lamp.position.set((i-1)*.32,1.26,.06)
    lamp.scale.set(.107,.107,.107)
    machine.add(lamp)
    return lamp
  })
  return {stage,mayor,visitor,lamps,folder}
}
