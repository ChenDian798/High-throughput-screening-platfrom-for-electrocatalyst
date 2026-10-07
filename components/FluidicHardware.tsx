'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, NAMES, deliveryInlet } from '@/lib/geometry';
import { gasCalculation } from '@/lib/gas';
import { Machine, Position, status, wastePosition } from '@/lib/machine';
import { Box, Label } from './ModelPrimitives';

function Pipe({ points,color='#8096a4',radius=.25,opacity=1 }: { points:Position[];color?:string;radius?:number;opacity?:number }) {
  const key=JSON.stringify(points);
  const geometry=useMemo(()=>{
    const vectors=(JSON.parse(key) as Position[]).map(p=>new THREE.Vector3(...p));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vectors),32,radius,8,false);
  },[key,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.6} transparent={opacity<1} opacity={opacity}/></mesh>;
}
function Bottle({ position,color,gas=false }: { position:Position;color:string;gas?:boolean }) {
  return <group position={position}>
    <mesh position={[0,0,0]}><cylinderGeometry args={[gas?2.6:3,gas?2.6:3,14,32]}/><meshStandardMaterial color={gas?'#aebcc7':'#cadde7'} transparent={!gas} opacity={gas?1:.22} depthWrite={gas} roughness={.55}/></mesh>
    {!gas&&<mesh position={[0,-2,0]}><cylinderGeometry args={[2.8,2.8,9,32]}/><meshStandardMaterial color={color} transparent opacity={.65}/></mesh>}
    <mesh position={[0,7.5,0]}><cylinderGeometry args={[1.5,1.5,1,24]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[0,8.4,0]}><cylinderGeometry args={[.5,.5,.8,16]}/><meshStandardMaterial color="#8299a7"/></mesh>
  </group>;
}
export function FluidicHardware({ machine,labels,labelScale=1.4 }: { machine:Machine;labels:boolean;labelScale?:number }) {
  const st=status(machine),origin=deliveryInlet(machine.config);
  const selected=st.selected.toLowerCase().includes('carrier')?3:NAMES.indexOf(st.selected);
  return <group position={origin}>
    <Box position={[0,-13,-27]} size={[42,1,47]} color="#e5ebef"/>
    {[...NAMES,'Solvent'].map((name,i)=>{
      const x=-15+i*10,color=COLORS[i]??'#a5b8c6';
      return <group key={name}>
        <Bottle position={[x,-5,-42]} color={color}/>
        <Pipe points={[[x,3.8,-42],[x,7,-35],[-2.25+i*1.5,4,-29],[-2.25+i*1.5,0,-25]]} color={color} radius={selected===i?.35:.22} opacity={selected===i?1:.45}/>
        {labels&&<Label scale={labelScale} position={[x,7,-45]} accent={selected===i}>{name}</Label>}
      </group>;
    })}
    <mesh position={[0,0,-23]}><cylinderGeometry args={[3,3,3,32]}/><meshStandardMaterial color="#b5c5cf" metalness={.4} roughness={.5}/></mesh>
    <mesh position={[0,1.8,-23]}><cylinderGeometry args={[2.2,2.2,.5,32]}/><meshStandardMaterial color="#f1f6f8"/></mesh>
    <group position={[0,2.2,-23]} rotation={[0,selected>=0?(selected-1.5)*.35:0,0]}><Box position={[0,0,-1]} size={[.3,.2,2]} color="#007b79"/></group>
    <Pipe points={[[0,0,-20],[0,0,-18],[0,0,-16]]}/>
    <Box position={[0,-.3,-12]} size={[7,5,8]} color="#e0e8ed"/>
    <mesh position={[0,2.5,-12]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[1,1,7,24]}/><meshStandardMaterial color="#a7c2cb" transparent opacity={.55}/></mesh>
    <Box position={[0,2.5,-12]} size={[1.5,1.5,1]} color={st.pump?'#007b79':'#6f8796'}/>
    <Pipe points={[[0,0,-8],[0,0,-5],[0,0,0]]}/>
    <mesh><sphereGeometry args={[.9,20,16]}/><meshStandardMaterial color={st.gas?'#007b79':'#acbdc8'}/></mesh>
    <GasInjectionParts machine={machine} labels={labels} labelScale={labelScale}/>
    {labels&&<>
      <Label scale={labelScale} position={[0,14,-47]}>Precursor reservoirs · A / B / C</Label>
      <Label scale={labelScale} position={[16,1,-28]}>Selector valve</Label>
      <Label scale={labelScale} position={[13,-2,-12]}>Dosing pump · {st.pump?'ON':'OFF'}</Label>
    </>}
  </group>;
}
function GasInjectionParts({machine,labels,labelScale}:{machine:Machine;labels:boolean;labelScale:number}) {
  const st=status(machine),g=machine.config.gasControl;
  const travel=st.gas ? .7*Math.sin(Math.PI*machine.elapsed/machine.queue[0].duration) : 0;
  return <group>
    <Bottle position={[-27,-5,-20]} color="#526e80" gas/>
    <Pipe points={[[-27,3.8,-20],[-27,5,-14],[-23,5,-10]]}/>
    <mesh position={[-23,5,-10]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[2,2,1,32]}/><meshStandardMaterial color="#eff4f7"/></mesh>
    <Box position={[-23,5,-9.4]} size={[.2,2.3,.15]} color="#526e80"/>
    <Pipe points={[[-23,5,-10],[-23,2,-7],[-22,0,-5]]}/>
    <Box position={[-22,0,-4]} size={[5,3,4]} color="#d2e2e6"/>
    <Box position={[-22,1.6,-4]} size={[3,.3,2]} color="#497f89"/>
    <Pipe points={[[-22,0,-2],[-19,0,0],[-13.5,0,0]]} color={st.gas?'#007b79':'#889aa8'}/>
    <Box position={[-12,0,0]} size={[3,2,2]} color={st.gas?'#007b79':'#7e929f'}/>
    <Box position={[-12,1.7+travel,0]} size={[2,.7,.7]} color={st.gas?'#007b79':'#a9b8c2'}/>
    <Pipe points={[[-10.5,0,0],[-5,0,0],[0,0,0]]} color={st.gas?'#007b79':'#889aa8'}/>
    <mesh><sphereGeometry args={[.9,20,16]}/><meshStandardMaterial color={st.gas?'#007b79':'#acbdc8'}/></mesh>
    {labels&&<>
      <Label scale={labelScale} position={[-33,3,-24]}>{machine.config.gas} cylinder</Label>
      <Label scale={labelScale} position={[-33,12,-12]}>Pressure regulator · {g.pressure} bar(g)</Label>
      <Label scale={labelScale} position={[-33,4,-2]}>Gas Flow Controller<br/>Q_g = {g.flow} μL/s</Label>
      <Label scale={labelScale} position={[-14,5,8]}>Fast solenoid valve · {st.gas?'OPEN':'CLOSED'}<br/>t_g = {(gasCalculation(g).seconds*1000).toFixed(1)} ms</Label>
      <Label scale={labelScale} position={[8,3,1]}>T-junction / phase-switch junction</Label>
    </>}
  </group>;
}
export function GasInjectionHardware({machine,labels}:{machine:Machine;labels:boolean}) {
  return <group position={deliveryInlet(machine.config)}><GasInjectionParts machine={machine} labels={labels} labelScale={1.4}/></group>;
}
export function WasteReservoir({ machine,labels,labelScale=1.4 }: { machine:Machine;labels:boolean;labelScale?:number }) {
  const [x]=wastePosition(machine.config);
  return <group>
    <Pipe points={[[x,.7,0],[x,-2,5],[x-7,-2,11],[x-12,4.4,15]]} color="#8e9b9e" radius={.35}/>
    <group position={[x-12,-4.4,15]}><Bottle position={[0,0,0]} color="#a2937d"/></group>
    {labels&&<Label scale={labelScale} position={[x-12,-6,22]}>Waste reservoir<br/>Drain from cleaning station</Label>}
  </group>;
}
