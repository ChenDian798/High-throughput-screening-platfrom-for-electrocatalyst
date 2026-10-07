'use client';
import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Machine, parkPosition, status, wastePosition } from '@/lib/machine';
import { deliveryInlet } from '@/lib/geometry';
import { FluidicHardware, WasteReservoir } from './FluidicHardware';
import { DispensingNozzle, SegmentedDeliveryTube, ViewSettings, WasteStation } from './Scene';
import { Box, Label } from './ModelPrimitives';

function DeliveryCamera({ view,p }: { view:Pick<ViewSettings,'camera'>;p:Machine['config'] }) {
  const {camera,controls,size}=useThree();
  const inlet=deliveryInlet(p);
  useEffect(()=>{
    const center=new THREE.Vector3(inlet[0]/2-5,p.depth+7,-18);
    const distance=Math.max(1,1.25/(size.width/size.height));
    const direction=view.camera==='top'?new THREE.Vector3(0,150,.1):view.camera==='side'?new THREE.Vector3(0,17,105):new THREE.Vector3(65,50,85);
    camera.position.copy(center).add(direction.multiplyScalar(distance));camera.lookAt(center);
    if(controls&&'target' in controls) { const orbit=controls as unknown as {target:THREE.Vector3;update:()=>void};orbit.target.copy(center);orbit.update(); }
  },[camera,controls,size.width,size.height,view.camera,inlet[0],p.depth]);return null;
}
export default function FluidicModel({ machine,camera,labels }: { machine:Machine;camera:ViewSettings['camera'];labels:boolean }) {
  const p=machine.config;
  const [wasteX]=wastePosition(p),[parkX]=parkPosition(p);
  const view={camera},st=status(machine);
  return <Canvas camera={{position:[70,80,100],fov:43,near:.1,far:600}} gl={{antialias:true}} aria-label="3D single-line delivery system">
    <color attach="background" args={['#f5f8fa']}/><ambientLight intensity={1.8}/><directionalLight position={[20,60,40]} intensity={2.5}/>
    <gridHelper args={[150,30,'#d5dee5','#e6edf1']} position={[-12,-13,-15]}/>
    <FluidicHardware machine={machine} labels={labels} labelScale={2}/><SegmentedDeliveryTube machine={machine}/><DispensingNozzle machine={machine}/>
    <WasteStation p={p} labels={false} volume={machine.wasteVolume}/><WasteReservoir machine={machine} labels={labels} labelScale={2}/>
    <Box position={[parkX,0,9]} size={[3,.2,3]} color="#c6ded9"/>
    {labels&&<>
      <Label scale={2} position={[machine.position[0]+5,machine.position[1]+6,machine.position[2]-3]}>Robot-mounted nozzle</Label>
      <Label scale={2} position={[12,p.depth+3,7]}>Outlet destination: {st.station}</Label>
      <Label scale={2} position={[p.count*(p.width+2)/2+7,0,15]}>Safe park · no waste collection</Label>
      <Label scale={2} position={[wasteX,-2,4]}>Waste / cleaning station</Label>
    </>}
    <OrbitControls makeDefault target={[-20,11,-18]} minDistance={15} maxDistance={350}/><DeliveryCamera view={view} p={p}/>
  </Canvas>;
}
