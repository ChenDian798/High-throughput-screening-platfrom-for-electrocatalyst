'use client';
import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, Config, DESIGN, NAMES, deliveryInlet, liquidHeight, wellX } from '@/lib/geometry';
import { Machine, segmentLayout, status, wastePosition } from '@/lib/machine';
import { Box, Label } from './ModelPrimitives';
import { FluidicHardware, GasInjectionHardware, WasteReservoir } from './FluidicHardware';

export type ViewSettings = { camera: 'iso'|'top'|'side'; exploded: boolean; lid: boolean; frame: boolean; opacity: number; section: boolean; labels: boolean; dimensions: boolean };
const cut = [new THREE.Plane(new THREE.Vector3(0,0,-1),0)];
function roundedPath(w: number,l: number,r: number, x=0,z=0) {
  const path = new THREE.Shape(); r = Math.min(r,w/2,l/2);
  const a=x-w/2,b=z-l/2,c=x+w/2,d=z+l/2;
  path.moveTo(a+r,b); path.lineTo(c-r,b); path.absarc(c-r,b+r,r,-Math.PI/2,0,false);
  path.lineTo(c,d-r); path.absarc(c-r,d-r,r,0,Math.PI/2,false);
  path.lineTo(a+r,d); path.absarc(a+r,d-r,r,Math.PI/2,Math.PI,false);
  path.lineTo(a,b+r); path.absarc(a+r,b+r,r,Math.PI,Math.PI*1.5,false); return path;
}
function Outline({ shape, height, y, color, opacity=1, section=false }: { shape: THREE.Shape; height: number; y: number; color: string; opacity?: number; section?: boolean }) {
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(shape,{ depth: Math.max(.001,height),bevelEnabled:false,curveSegments:16 }),[shape,height]);
  useEffect(() => () => geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} rotation={[-Math.PI/2,0,0]} position={[0,y,0]}>
    <meshStandardMaterial color={color} transparent={opacity<1} opacity={opacity} roughness={.65} metalness={.15} side={THREE.DoubleSide} clippingPlanes={section ? cut : []}/>
  </mesh>;
}
function Seal({ p, x, y, color='#394a55', section }: { p: Config; x: number; y: number; color?: string; section: boolean }) {
  const shape = useMemo(() => {
    const outer=roundedPath(p.width+1.2,p.length+1.2,1.1,x); outer.holes.push(roundedPath(p.width+.25,p.length+.25,.7,x)); return outer;
  },[p.width,p.length,x]);
  return <Outline shape={shape} y={y} height={.18} color={color} section={section}/>;
}
export function SharedWorkingElectrode({ p, view }: { p: Config; view: ViewSettings }) {
  const width=p.count*(p.width+DESIGN.wall)+6;
  const baseOffset=view.exploded ? -5 : 0;
  return <group>
    <Box position={[0,-2.5+baseOffset,0]} size={[width+3,1.8,p.length+9]} color="#c1ccd5" section={view.section}/>
    <Box position={[0,-1.2+baseOffset/2,0]} size={[width+1,.8,p.length+7]} color="#f1e8d5" section={view.section}/>
    <Box position={[0,-.4,0]} size={[width,.8,p.length+6]} color="#546673" opacity={view.opacity} section={view.section}/>
    <Box position={[width/2+1.5,-.35,-p.length/2-1.5]} size={[3,.6,2]} color="#b99b52"/>
    {Array.from({length:p.count},(_,i)=><Seal key={i} p={p} x={wellX(i,p)} y={.01} section={view.section}/>)}
    {view.labels && <>
      <Label position={[width/2+2,0,-p.length/2-2]}>WE · one terminal</Label>
      <Label position={[0,-3.7,p.length/2+7]}>Continuous working-electrode floor</Label>
      {view.exploded && <><Label position={[-width/2,-4,6]}>Electrical insulation</Label><Label position={[-width/2,-8,7]}>Rigid support</Label></>}
    </>}
  </group>;
}
export function InsulatingWellFrame({ p,view }: { p: Config; view: ViewSettings }) {
  const width=p.count*(p.width+DESIGN.wall)+2;
  const shape=useMemo(() => {
    const outer=roundedPath(width,p.length+4,.8);
    for(let i=0;i<p.count;i++) outer.holes.push(roundedPath(p.width,p.length,DESIGN.corner,wellX(i,p)));
    return outer;
  },[width,p.width,p.length,p.count]);
  if(!view.frame) return null;
  return <group>
    <Outline shape={shape} y={view.exploded?3:0} height={p.depth} color="#e4e8df" section={view.section}/>
    {view.labels && <Label position={[-width/2-2,p.depth/2,5]}>Insulating frame · isolated wells</Label>}
  </group>;
}
export function WellLiquid({ p,i,volume,tip,view }: { p: Config; i: number; volume: number; tip: number; view: ViewSettings }) {
  const height=liquidHeight(volume,tip,p), x=wellX(i,p);
  const lowerShape=useMemo(()=>roundedPath(p.width,p.length,DESIGN.corner,x),[p.width,p.length,x]);
  const upperShape=useMemo(()=>{const a=roundedPath(p.width,p.length,DESIGN.corner,x);a.holes.push(roundedPath(p.postWidth,p.postLength,DESIGN.postCorner,x));return a;},[p.width,p.length,p.postWidth,p.postLength,x]);
  if(volume<.01) return null;
  const lower=Math.min(height,tip);
  return <group>
    <Outline shape={lowerShape} y={0} height={lower} color={COLORS[i]} opacity={.73} section={view.section}/>
    {height>tip && <Outline shape={upperShape} y={tip} height={height-tip} color={COLORS[i]} opacity={.73} section={view.section}/>}
  </group>;
}
export function ProtrudingCounterElectrode({ p,view,y }: { p: Config; view: ViewSettings; y: number }) {
  const shape=useMemo(()=>roundedPath(p.count*(p.width+2)+2,p.length+4,.8),[p.count,p.width,p.length]);
  const posts=useMemo(()=>Array.from({length:p.count},(_,i)=>roundedPath(p.postWidth,p.postLength,DESIGN.postCorner,wellX(i,p))),[p.count,p.width,p.postWidth,p.postLength]);
  const length=Math.max(.01,p.depth-p.clearance);
  return <group>
    <Outline shape={shape} y={y} height={.75} color="#8b9aa4" opacity={view.opacity} section={view.section}/>
    {posts.map((post,i)=><Outline key={i} shape={post} y={y-length} height={length} color="#8b9aa4" opacity={view.opacity} section={view.section}/>)}
    <Box position={[-p.count*(p.width+2)/2-2,y+.4,-p.length/2-1.2]} size={[4,.65,2]} color="#b99b52"/>
    {view.labels && <Label position={[-p.count*(p.width+2)/2-4,y+1,-p.length/2-2]}>CE · one common plate</Label>}
  </group>;
}
export function GuidedLid({ p,view,lid }: { p: Config; view: ViewSettings; lid: number }) {
  const width=p.count*(p.width+2)+6, lift=lid*(p.depth+11)+(view.exploded?7:0), y=p.depth+lift;
  return <group>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*(width/2-1),p.depth+9,-p.length/2-3]}><cylinderGeometry args={[.35,.35,(p.depth+9)*2,16]}/><meshStandardMaterial color="#9baab5" metalness={.6} roughness={.3}/></mesh>
      <Box position={[side*(width/2+1),p.depth/2,0]} size={[1,p.depth,1.5]} color="#a9b5be"/>
      <Box position={[side*(width/2+1),y+1.6,0]} size={[2,1,2]} color={lid===0?'#007b79':'#617d8c'}/>
      <mesh position={[side*(width/2-1),-.2,p.length/2+2]}><cylinderGeometry args={[.65,.65,2.2,6]}/><meshStandardMaterial color="#748897"/></mesh>
    </group>)}
    {view.lid && <>
      <ProtrudingCounterElectrode p={p} view={view} y={y}/>
      <Box position={[0,y+1.12+(view.exploded?2:0),0]} size={[width,.7,p.length+6]} color="#f1e8d5" section={view.section}/>
      <Box position={[0,y+2+(view.exploded?4:0),0]} size={[width+2,1.1,p.length+8]} color="#c1cdd5" opacity={view.opacity} section={view.section}/>
      {Array.from({length:p.count},(_,i)=><group key={i}>
        <Seal p={p} x={wellX(i,p)} y={y-.18} section={view.section}/>
        <mesh position={[wellX(i,p),y+2.7,-p.length/2-.7]}><cylinderGeometry args={[.4,.4,1.2,16]}/><meshStandardMaterial color="#007b79"/></mesh>
      </group>)}
      {view.labels && <><Label position={[0,y+5,0]}>Guided lid · {lid===0?'clamped':'raised'}</Label><Label position={[0,y+3,-p.length/2-5]}>Separate conceptual vents · air escape</Label></>}
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
export function DispensingNozzle({ machine }: { machine: Machine }) {
  const st=status(machine), [x,y,z]=machine.position;
  const index=machine.queue[0]?.index??0;
  const surface=liquidHeight(machine.fills[index]??0,machine.config.depth+12,machine.config);
  const streamLength=Math.max(.01,y-surface);
  return <group position={[x,y,z]}>
    <mesh position={[0,1,0]}><cylinderGeometry args={[.35,.18,2,16]}/><meshStandardMaterial color="#476a7d" metalness={.5} roughness={.3}/></mesh>
    <Box position={[0,2.7,0]} size={[1.4,1.4,1.4]} color={st.antiDrip?'#007b79':'#d7a64e'}/>
    {st.dispensing && <mesh position={[0,-streamLength/2,0]}><cylinderGeometry args={[.08,.08,streamLength,8]}/><meshBasicMaterial color={COLORS[index]}/></mesh>}
    {st.flowing && (machine.queue[0]?.kind==='waste'||machine.queue[0]?.kind==='flush') && <mesh position={[0,-2,0]}><cylinderGeometry args={[.1,.1,4,8]}/><meshBasicMaterial color={machine.queue[0].segment?.kind===machine.config.gas?'#a9b4bd':'#b4c5cf'} transparent opacity={.65}/></mesh>}
  </group>;
}
export function RobotGantry({ machine,labels }: { machine: Machine; labels: boolean }) {
  const p=machine.config, span=p.count*(p.width+2)+41, top=2*p.depth+29;
  const front=machine.position[2]+p.length/2+12;
  return <group>
    {[-1,1].map(side=><group key={side}>
      <Box position={[side*span/2,top/2,-9]} size={[1.4,top+7,1.4]} color="#c1cdd6"/>
      <Box position={[side*span/2,-4,-9]} size={[5,1,8]} color="#bac7d0"/>
    </group>)}
    <Box position={[0,top,-9]} size={[span,2,2]} color="#bccad4"/>
    <Box position={[machine.position[0],top,-9]} size={[4,3.5,4]} color="#547e90"/>
    <Box position={[machine.position[0],top,(front-9)/2]} size={[1.3,1.3,front+11]} color="#b9c9d2"/>
    <Box position={[machine.position[0],(top+machine.position[1]+4)/2,front]} size={[1.2,top-machine.position[1]-4,1.2]} color="#9eafb9"/>
    <Box position={[machine.position[0],machine.position[1]+4,(front+machine.position[2])/2]} size={[.8,.8,front-machine.position[2]]} color="#9eafb9"/>
    <DispensingNozzle machine={machine}/>
    {labels && <Label position={[span/2+1,top+4,-9]}>XYZ gantry</Label>}
  </group>;
}
export function SegmentedDeliveryTube({ machine }: { machine: Machine }) {
  const p=machine.config,[x,y,z]=machine.position;
  const curve=useMemo(()=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(...deliveryInlet(p)),
    new THREE.Vector3(-p.count*(p.width+2)/2-15,2*p.depth+37,p.length/2+15),
    new THREE.Vector3(x-5,2*p.depth+39,z+p.length/2+15),
    new THREE.Vector3(x,y+4,z+p.length/2+15),new THREE.Vector3(x,y+4,z)
  ]),[p.count,p.width,p.depth,x,y,z]);
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
function CameraController({ view,combined }: { view: ViewSettings;combined:boolean }) {
  const {camera,controls,invalidate,size}=useThree();
  useEffect(()=>{
    const factor=(combined?.95:1)*Math.max(1,1.05/(size.width/size.height));
    const focus=view.section&&!view.exploded;
    const targetY=focus?3:18;
    const targetX=focus||!combined?0:-10,targetZ=focus||!combined?0:-20;
    const positions=focus?{iso:[32,24,36],top:[0,60,.1],side:[0,3,48]}:combined?{iso:[90,80,95],top:[-10,155,-20],side:[-10,18,145]}:{iso:[70,60,75],top:[0,125,.1],side:[0,18,125]};
    const pos=positions[view.camera];
    camera.position.set(targetX+(pos[0]-targetX)*factor,targetY+(pos[1]-targetY)*factor,targetZ+(pos[2]-targetZ)*factor);
    camera.lookAt(targetX,targetY,targetZ);
    if(controls && 'target' in controls) { (controls as unknown as {target:THREE.Vector3;update:()=>void}).target.set(targetX,targetY,targetZ); (controls as unknown as {update:()=>void}).update(); }
    invalidate();
  },[view.camera,view.section,view.exploded,combined,camera,controls,invalidate,size.width,size.height]);return null;
}
export default function Scene({ machine,view,combined=false }: { machine: Machine;view:ViewSettings;combined?:boolean }) {
  const p=machine.config,tip=p.clearance+machine.lid*(p.depth+11)+(view.exploded?7:0);
  const st=status(machine);
  return <Canvas camera={{position:[70,60,75],fov:43,near:.1,far:500}} gl={{antialias:true,localClippingEnabled:true}} aria-label={combined?'3D combined instrument':'3D robot and electrode assembly'}>
    <color attach="background" args={['#f5f8fa']}/><ambientLight intensity={1.8}/><directionalLight position={[20,50,30]} intensity={2.5}/><directionalLight position={[-30,15,-10]} intensity={1}/>
    <gridHelper args={[combined?150:110,combined?30:22,'#d5dee5','#e6edf1']} position={combined?[-10,-13,-20]:[0,-4.5,0]}/>
    {combined&&<><FluidicHardware machine={machine} labels={view.labels}/><WasteReservoir machine={machine} labels={view.labels}/></>}
    {!combined&&<GasInjectionHardware machine={machine} labels={view.labels}/>}
    <SharedWorkingElectrode p={p} view={view}/><InsulatingWellFrame p={p} view={view}/>
    {machine.fills.map((volume,i)=><WellLiquid key={i} p={p} i={i} volume={volume} tip={tip} view={view}/>)}
    <GuidedLid p={p} view={view} lid={machine.lid}/>
    <WasteStation p={p} labels={view.labels} volume={machine.wasteVolume}/><RobotGantry machine={machine} labels={view.labels}/><SegmentedDeliveryTube machine={machine}/>
    {view.labels && <>
      {machine.fills.map((v,i)=><Label key={i} position={[wellX(i,p),1,p.length/2+6]} accent>Well {i+1} · {NAMES[i]}<br/>{v.toFixed(0)} μL</Label>)}
      <Label position={[machine.position[0],machine.position[1]+3,machine.position[2]+4]}>Outlet anti-drip: {st.antiDrip?'CLOSED':'OPEN'}</Label>
    </>}
    {view.dimensions && <>
      <Label position={[wellX(0,p),-.5,-p.length/2-5]}>{p.width} × {p.length} × {p.depth} mm / well</Label>
      <Label position={[0,Math.max(1,p.clearance),p.length/2+3]}>{p.clearance} mm closed tip clearance</Label>
      <Label position={[0,p.depth+machine.lid*(p.depth+11)-2,-p.length/2-3]}>{(p.depth-p.clearance).toFixed(2)} mm protrusion length</Label>
    </>}
    <OrbitControls makeDefault target={[0,18,0]} minDistance={12} maxDistance={250} enablePan/>
    <CameraController view={view} combined={combined}/>
  </Canvas>;
}
