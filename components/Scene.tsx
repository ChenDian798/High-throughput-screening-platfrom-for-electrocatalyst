'use client';
import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, Config, DESIGN, NAMES, ROWS, arrayHalfWidth, capTop, cellIndex, cellX, cellZ, cells, deliveryInlet, exposedArea, liquidHeight, qrceOffset, rowPotential, septumOffset, ventOffset } from '@/lib/geometry';
import { Machine, segmentLayout, status, wastePosition } from '@/lib/machine';
import { Box, Cylinder, Label, cut } from './ModelPrimitives';
import { FluidicHardware, GasInjectionHardware, WasteReservoir } from './FluidicHardware';

export type ViewSettings = { camera: 'iso'|'top'|'side'; exploded: boolean; caps: boolean; frame: boolean; opacity: number; section: boolean; labels: boolean; dimensions: boolean };
function roundedPath(w: number,l: number,r: number, x=0,z=0) {
  const path = new THREE.Shape(); r = Math.min(r,w/2,l/2);
  const a=x-w/2,b=z-l/2,c=x+w/2,d=z+l/2;
  path.moveTo(a+r,b); path.lineTo(c-r,b); path.absarc(c-r,b+r,r,-Math.PI/2,0,false);
  path.lineTo(c,d-r); path.absarc(c-r,d-r,r,0,Math.PI/2,false);
  path.lineTo(a+r,d); path.absarc(a+r,d-r,r,Math.PI/2,Math.PI,false);
  path.lineTo(a,b+r); path.absarc(a+r,b+r,r,Math.PI,Math.PI*1.5,false); return path;
}
function circlePath(radius: number,x: number,z: number) { const path=new THREE.Path(); path.absarc(x,z,radius,0,Math.PI*2,true); return path; }
function Outline({ shape, height, y, color, opacity=1, section=false }: { shape: THREE.Shape; height: number; y: number; color: string; opacity?: number; section?: boolean }) {
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(shape,{ depth: Math.max(.001,height),bevelEnabled:false,curveSegments:24 }),[shape,height]);
  useEffect(() => () => geometry.dispose(),[geometry]);
  // Shapes are drawn in (x, z); rotating +90° about x maps shape y to scene +z and extrudes downward from y+height.
  return <mesh geometry={geometry} rotation={[Math.PI/2,0,0]} position={[0,y+height,0]}>
    <meshStandardMaterial color={color} transparent={opacity<1} opacity={opacity} roughness={.65} metalness={.15} side={THREE.DoubleSide} clippingPlanes={section ? cut : []}/>
  </mesh>;
}
export function arrayFootprint(p: Config) { return { w: p.count*DESIGN.pitch+8, l: DESIGN.rows*DESIGN.pitch+8 }; }
// Exploded offsets per layer; the glassy-carbon working electrode stays fixed as the datum.
function offsets(exploded: boolean) { return exploded ? { base:-8, copper:-4, gasket:2, top:4.5, cap:10 } : { base:0, copper:0, gasket:0, top:0, cap:0 }; }
// Legion stack (bottom → top): PEEK base, copper contact plate, glassy-carbon WE, PDMS gasket, PEEK cell block.
export function LegionStack({ p, view, outputs }: { p: Config; view: ViewSettings; outputs: boolean }) {
  const {w,l}=arrayFootprint(p), o=offsets(view.exploded);
  const gasket=useMemo(()=>{const s=roundedPath(w-1,l-1,.8);cells(p).forEach(c=>s.holes.push(circlePath(DESIGN.gasket/2,cellX(c.col,p),cellZ(c.row))));return s;},[w,l,p.count]);
  const block=useMemo(()=>{const s=roundedPath(w,l,1.2);cells(p).forEach(c=>s.holes.push(circlePath(p.diameter/2,cellX(c.col,p),cellZ(c.row))));return s;},[w,l,p.count,p.diameter]);
  return <group>
    <Box position={[0,-5+o.base,0]} size={[w,2,l]} color="#d8cfb8" section={view.section}/>
    <Box position={[0,-3.5+o.copper,0]} size={[w-1,1,l-1]} color="#c8834f" section={view.section}/>
    <Box position={[w/2+1.5,-3.5+o.copper,-l/2+3]} size={[4,.8,3]} color="#c8834f"/>
    <Box position={[0,-1.5,0]} size={[w-1,3,l-1]} color="#30353a" opacity={view.opacity} section={view.section}/>
    <Outline shape={gasket} y={o.gasket} height={.5} color="#b9c7cf" opacity={.9} section={view.section}/>
    {view.frame && <Outline shape={block} y={.5+o.top} height={p.depth-.5} color="#d8cfb8" opacity={view.opacity} section={view.section}/>}
    {[-1,1].flatMap(sx=>[-1,1].map(sz=><Cylinder key={`${sx}${sz}`} position={[sx*(w/2-1.8),(p.depth-6)/2+(view.exploded?1:0),sz*(l/2-1.8)]} radius={.8} height={p.depth+6.6+(view.exploded?18:0)} color="#9aa7b1" metal={.6} section={view.section}/>))}
    {view.labels && <>
      <Label position={[w/2+7,-3.5+o.copper,-l/2]}>WE · common<br/>copper contact</Label>
      {view.exploded && <>
        <Label position={[-w/2-10,-5+o.base,4]}>PEEK base</Label>
        <Label position={[-w/2-10,-3.5+o.copper,6]}>Copper contact plate</Label>
        <Label position={[-w/2-10,-1.5,8]}>Glassy-carbon WE · 3 mm</Label>
        <Label position={[-w/2-10,o.gasket,10]}>PDMS gasket · Ø{DESIGN.gasket} openings</Label>
        <Label position={[-w/2-10,p.depth/2+o.top,12]}>PEEK cell block · Ø{p.diameter} bores</Label>
        <Label position={[-w/2-10,capTop(p)+o.cap,14]}>Septum cap per cell</Label>
      </>}
      {!view.exploded && <Label position={[0,-8,l/2+4]}>Shared glassy-carbon WE plate · outputs {outputs?'ON':'off'}</Label>}
    </>}
  </group>;
}
// One fixed cap per cell: needle septum, sealed QRCE feedthrough and a liquid-blocking vent membrane.
export function SeptumCap({ p, col, row, view }: { p: Config; col: number; row: number; view: ViewSettings }) {
  const x=cellX(col,p), z=cellZ(row), y=p.depth+offsets(view.exploded).cap;
  return <group>
    <Cylinder position={[x,y+DESIGN.cap/2,z]} radius={p.diameter/2+.9} height={DESIGN.cap} color="#9fb1bd" opacity={view.opacity} section={view.section}/>
    <Cylinder position={[x+septumOffset,y+DESIGN.cap/2+.1,z]} radius={.95} height={DESIGN.cap+.25} color="#c8574f" section={view.section}/>
    <Cylinder position={[x+qrceOffset,y+DESIGN.cap/2+.25,z]} radius={.7} height={DESIGN.cap+.5} color="#3e4c56" section={view.section}/>
    <Cylinder position={[x,y+DESIGN.cap+.12,z+ventOffset]} radius={.6} height={.25} color="#f6f7f7" section={view.section}/>
  </group>;
}
export function CellLiquid({ p, index, volume, view }: { p: Config; index: number; volume: number; view: ViewSettings }) {
  if(volume<.01) return null;
  const c=cells(p)[index], h=liquidHeight(volume,p), x=cellX(c.col,p), z=cellZ(c.row), lift=offsets(view.exploded).top;
  const g=Math.min(h,.5);
  return <group>
    <Cylinder position={[x,g/2,z]} radius={DESIGN.gasket/2} height={g} color={COLORS[c.col]} section={view.section}/>
    {h>.5 && <Cylinder position={[x,.5+(h-.5)/2+lift,z]} radius={p.diameter/2-.02} height={h-.5} color={COLORS[c.col]} section={view.section}/>}
  </group>;
}
export function QRCE({ p, index, view, on }: { p: Config; index: number; view: ViewSettings; on: boolean }) {
  const c=cells(p)[index], x=cellX(c.col,p)+qrceOffset, z=cellZ(c.row), lift=offsets(view.exploded).cap;
  const bottom=p.qrceGap+lift, top=capTop(p)+3+lift, {l}=arrayFootprint(p);
  const hx=cellX(c.col,p)+(c.row-.5)*2.4, hy=capTop(p)+2.4, hz=-l/2-4.5;
  const geometry=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(x,top,z),new THREE.Vector3(x,top+2,z-1.5),new THREE.Vector3(hx,top+2.5,hz+3),new THREE.Vector3(hx,hy,hz)
  ]),24,.18,8,false),[x,top,z,hx,hy,hz]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group>
    <Cylinder position={[x,(bottom+top)/2,z]} radius={DESIGN.wire/2} height={top-bottom} color="#d9dde0" metal={.85} section={view.section}/>
    <mesh geometry={geometry}><meshStandardMaterial color={on?'#00a39a':'#7b4bb3'} emissive={on?'#00655f':'#000000'}/></mesh>
  </group>;
}
export function PotentiostatBoard({ machine, labels }: { machine: Machine; labels: boolean }) {
  const p=machine.config, {w,l}=arrayFootprint(p), on=machine.outputs;
  return <group>
    <Box position={[0,capTop(p)+1.5,-l/2-4.5]} size={[w-4,1.6,2.6]} color="#2f3d47"/>
    <Box position={[0,capTop(p)+1.5,-l/2-11]} size={[w+4,8,3]} color="#3d5a68"/>
    {cells(p).map(c=><Box key={c.index} position={[cellX(c.col,p)+(c.row-.5)*2.4,capTop(p)+3.5,-l/2-9.4]} size={[1.4,1,.4]} color={on?'#3fd0b6':'#7f929e'}/>)}
    {labels && <>
      <Label position={[0,capTop(p)+9.5,-l/2-11]}>{p.count*DESIGN.rows}-channel potentiostat · FPGA<br/>one channel per QRCE</Label>
      <Label position={[w/2+6,capTop(p)+3,-l/2-4.5]}>QRCE pin header</Label>
    </>}
  </group>;
}
export function WasteStation({ p,labels,volume }: { p: Config; labels: boolean; volume: number }) {
  const pos=wastePosition(p);const shape=useMemo(()=>{const s=roundedPath(7,7,1);s.holes.push(roundedPath(5,5,.8));return s;},[]);
  return <group position={[pos[0],0,0]}>
    <Box position={[0,-2,0]} size={[8,3,8]} color="#c3ced5"/>
    <Outline shape={shape} y={0} height={p.depth} color="#dae2e6"/>
    <mesh position={[0,1,0]}><cylinderGeometry args={[2,2,.3,24]}/><meshStandardMaterial color="#91a5af"/></mesh>
    {labels && <Label position={[0,-4,3]}>Waste / cleaning<br/>{volume.toFixed(0)} μL liquid discharged</Label>}
  </group>;
}
// The nozzle carries a short needle that passes through a cell's septum during dispensing.
export function DispensingNozzle({ machine }: { machine: Machine }) {
  const st=status(machine), [x,y,z]=machine.position, p=machine.config;
  const step=machine.queue[0], index=step?.index??0, col=step?.col??0;
  const needle=DESIGN.cap+.5, surface=liquidHeight(machine.fills[index]??0,p);
  const streamLength=Math.max(.01,y-needle-surface);
  return <group position={[x,y,z]}>
    <mesh position={[0,1,0]}><cylinderGeometry args={[.35,.18,2,16]}/><meshStandardMaterial color="#476a7d" metalness={.5} roughness={.3}/></mesh>
    <mesh position={[0,-needle/2,0]}><cylinderGeometry args={[.1,.1,needle,8]}/><meshStandardMaterial color="#c9d1d6" metalness={.8} roughness={.25}/></mesh>
    <Box position={[0,2.7,0]} size={[1.4,1.4,1.4]} color={st.antiDrip?'#007b79':'#d7a64e'}/>
    {st.dispensing && <mesh position={[0,-needle-streamLength/2,0]}><cylinderGeometry args={[.08,.08,streamLength,8]}/><meshBasicMaterial color={COLORS[col]}/></mesh>}
    {st.flowing && (step?.kind==='waste'||step?.kind==='flush') && <mesh position={[0,-needle-2,0]}><cylinderGeometry args={[.1,.1,4,8]}/><meshBasicMaterial color={step.segment?.kind===p.gas?'#a9b4bd':'#b4c5cf'} transparent opacity={.65}/></mesh>}
  </group>;
}
export function RobotGantry({ machine,labels }: { machine: Machine; labels: boolean }) {
  const p=machine.config, span=2*arrayHalfWidth(p)+33, top=2*p.depth+29;
  const front=machine.position[2]+DESIGN.rows*DESIGN.pitch/2+14;
  return <group>
    {[-1,1].map(side=><group key={side}>
      <Box position={[side*span/2,top/2,-17]} size={[1.4,top+7,1.4]} color="#c1cdd6"/>
      <Box position={[side*span/2,-4,-17]} size={[5,1,8]} color="#bac7d0"/>
    </group>)}
    <Box position={[0,top,-17]} size={[span,2,2]} color="#bccad4"/>
    <Box position={[machine.position[0],top,-17]} size={[4,3.5,4]} color="#547e90"/>
    <Box position={[machine.position[0],top,(front-17)/2]} size={[1.3,1.3,front+17]} color="#b9c9d2"/>
    <Box position={[machine.position[0],(top+machine.position[1]+4)/2,front]} size={[1.2,top-machine.position[1]-4,1.2]} color="#9eafb9"/>
    <Box position={[machine.position[0],machine.position[1]+4,(front+machine.position[2])/2]} size={[.8,.8,front-machine.position[2]]} color="#9eafb9"/>
    <DispensingNozzle machine={machine}/>
    {labels && <Label position={[span/2+1,top+4,-17]}>XYZ gantry</Label>}
  </group>;
}
export function SegmentedDeliveryTube({ machine }: { machine: Machine }) {
  const p=machine.config,[x,y,z]=machine.position,front=DESIGN.rows*DESIGN.pitch/2+15;
  const curve=useMemo(()=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(...deliveryInlet(p)),
    new THREE.Vector3(-arrayHalfWidth(p)-15,2*p.depth+37,front),
    new THREE.Vector3(x-5,2*p.depth+39,z+front),
    new THREE.Vector3(x,y+4,z+front),new THREE.Vector3(x,y+4,z)
  ]),[p.count,p.depth,x,y,z]);
  const geometry=useMemo(()=>deliveryGeometry(curve,p,.35,96),[curve,p.gasControl.geometry,p.gasControl.width,p.gasControl.height]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const segments=segmentLayout(machine);
  return <group>
    <mesh geometry={geometry}><meshStandardMaterial color="#a5bccb" transparent opacity={.18} depthWrite={false}/></mesh>
    {segments.map(({segment:seg,start,end},i)=><TubeSegment key={i} p={p} curve={curve} start={start} end={end} color={COLORS[NAMES.indexOf(seg.kind)]??(seg.kind===p.gas?'#a0aeb8':'#c4ae91')}/>)}
  </group>;
}
function deliveryGeometry(curve:THREE.CatmullRomCurve3,p:Config,radius:number,steps:number) {
  if(p.gasControl.geometry==='circular') return new THREE.TubeGeometry(curve,steps,radius,10,false);
  const {width,height}=p.gasControl,scale=radius*2/Math.max(width,height),w=width*scale,h=height*scale;
  const section=new THREE.Shape();section.moveTo(-w/2,-h/2);section.lineTo(w/2,-h/2);section.lineTo(w/2,h/2);section.lineTo(-w/2,h/2);section.closePath();
  return new THREE.ExtrudeGeometry(section,{steps,extrudePath:curve,bevelEnabled:false});
}
function TubeSegment({ curve,start,end,color,p }: { curve: THREE.CatmullRomCurve3; start:number;end:number;color:string;p:Config }) {
  const geometry=useMemo(()=>{
    if(end-start<.0001) return new THREE.BufferGeometry();
    const points=Array.from({length:18},(_,i)=>curve.getPointAt(Math.min(1,Math.max(0,start+(end-start)*i/17))));
    return deliveryGeometry(new THREE.CatmullRomCurve3(points),p,.21,18);
  },[curve,start,end,p.gasControl.geometry,p.gasControl.width,p.gasControl.height]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  if(end-start<.0001) return null;
  return <mesh geometry={geometry}><meshStandardMaterial color={color} transparent opacity={.85}/></mesh>;
}
function CameraController({ view,combined,p }: { view: ViewSettings;combined:boolean;p:Config }) {
  const {camera,controls,invalidate,size}=useThree();
  useEffect(()=>{
    const factor=(combined?.95:1)*Math.max(1,1.05/(size.width/size.height));
    const focus=view.section&&!view.exploded;
    const targetY=focus?p.depth/2:18;
    const targetX=focus||!combined?0:-10,targetZ=focus?DESIGN.pitch/2:combined?-20:0;
    const positions=focus?{iso:[34,30,52],top:[0,70,DESIGN.pitch/2+.1],side:[0,p.depth/2,58]}:combined?{iso:[90,80,95],top:[-10,155,-20],side:[-10,18,145]}:{iso:[70,60,75],top:[0,125,.1],side:[0,18,125]};
    const pos=positions[view.camera];
    camera.position.set(targetX+(pos[0]-targetX)*factor,targetY+(pos[1]-targetY)*factor,targetZ+(pos[2]-targetZ)*factor);
    camera.lookAt(targetX,targetY,targetZ);
    if(controls && 'target' in controls) { (controls as unknown as {target:THREE.Vector3;update:()=>void}).target.set(targetX,targetY,targetZ); (controls as unknown as {update:()=>void}).update(); }
    invalidate();
  },[view.camera,view.section,view.exploded,combined,camera,controls,invalidate,size.width,size.height,p.depth]);return null;
}
export default function Scene({ machine,view,combined=false }: { machine: Machine;view:ViewSettings;combined?:boolean }) {
  const p=machine.config, st=status(machine), {w,l}=arrayFootprint(p);
  return <Canvas camera={{position:[70,60,75],fov:43,near:.1,far:500}} gl={{antialias:true,localClippingEnabled:true}} aria-label={combined?'3D combined instrument':'3D robot and Legion cell array'}>
    <color attach="background" args={['#f5f8fa']}/><ambientLight intensity={1.8}/><directionalLight position={[20,50,30]} intensity={2.5}/><directionalLight position={[-30,15,-10]} intensity={1}/>
    <gridHelper args={[combined?150:110,combined?30:22,'#d5dee5','#e6edf1']} position={combined?[-10,-13,-20]:[0,-6.5,0]}/>
    {combined&&<><FluidicHardware machine={machine} labels={view.labels}/><WasteReservoir machine={machine} labels={view.labels}/></>}
    {!combined&&<GasInjectionHardware machine={machine} labels={view.labels}/>}
    <LegionStack p={p} view={view} outputs={machine.outputs}/>
    {machine.fills.map((volume,i)=><CellLiquid key={i} p={p} index={i} volume={volume} view={view}/>)}
    {view.caps && cells(p).map(c=><group key={c.index}><SeptumCap p={p} col={c.col} row={c.row} view={view}/><QRCE p={p} index={c.index} view={view} on={machine.outputs}/></group>)}
    {view.caps && <PotentiostatBoard machine={machine} labels={view.labels}/>}
    <WasteStation p={p} labels={view.labels} volume={machine.wasteVolume}/><RobotGantry machine={machine} labels={view.labels}/><SegmentedDeliveryTube machine={machine}/>
    {view.labels && <>
      {NAMES.slice(0,p.count).map((name,col)=><Label key={name} position={[cellX(col,p),-1,l/2+8]} accent>{name} · {machine.fills[cellIndex(col,0)].toFixed(0)} / {machine.fills[cellIndex(col,1)].toFixed(0)} μL</Label>)}
      {ROWS.map((row,r)=><Label key={row} position={[-w/2-8,capTop(p)+1,cellZ(r)]} accent>{row} · {rowPotential(r,p).toFixed(2)} V</Label>)}
      <Label position={[machine.position[0],machine.position[1]+3,machine.position[2]+4]}>Outlet anti-drip: {st.antiDrip?'CLOSED':'OPEN'}</Label>
    </>}
    {view.dimensions && <>
      <Label position={[cellX(0,p),-.5,-l/2-3]}>Ø{p.diameter} × {p.depth} mm cell · {DESIGN.pitch} mm pitch</Label>
      <Label position={[0,p.qrceGap,l/2+3]}>QRCE tip {p.qrceGap} mm above WE</Label>
      <Label position={[w/2+4,.5,l/2]}>Exposed WE Ø{DESIGN.gasket} = {exposedArea().toFixed(1)} mm²</Label>
    </>}
    <OrbitControls makeDefault target={[0,18,0]} minDistance={12} maxDistance={250} enablePan/>
    <CameraController view={view} combined={combined} p={p}/>
  </Canvas>;
}
