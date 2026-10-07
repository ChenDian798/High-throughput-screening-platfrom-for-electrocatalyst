'use client';
import { isValidElement, useEffect, useMemo } from 'react';
import * as THREE from 'three';
const cut = [new THREE.Plane(new THREE.Vector3(0,0,-1),0)];
export function Box({ position, size, color='#dde4e9', opacity=1, section=false }: { position: [number,number,number]; size: [number,number,number]; color?: string; opacity?: number; section?: boolean }) {
  return <mesh position={position}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.65} metalness={.15} transparent={opacity<1} opacity={opacity} clippingPlanes={section?cut:[]}/></mesh>;
}
export function Label({ position, children, accent=false, scale=1 }: { position: [number,number,number]; children: React.ReactNode; accent?: boolean; scale?:number }) {
  function text(node: React.ReactNode): string {
    if(typeof node==='string'||typeof node==='number') return String(node);
    if(Array.isArray(node)) return node.map(text).join('');
    if(isValidElement<{children?:React.ReactNode}>(node)) return node.type==='br'?'\n':text(node.props.children);
    return '';
  }
  const content=text(children);
  const {texture,width,height}=useMemo(()=>{
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;
    const lines=content.split('\n');context.font='28px Arial';
    const width=Math.ceil(Math.max(...lines.map(line=>context.measureText(line).width)))+32;
    const height=lines.length*38+20;canvas.width=width;canvas.height=height;
    context.fillStyle=accent?'#edf6f6':'#ffffff';context.fillRect(0,0,width,height);
    context.strokeStyle=accent?'#b7d3d4':'#d5e0e6';context.lineWidth=2;context.strokeRect(1,1,width-2,height-2);
    context.font='28px Arial';context.fillStyle=accent?'#365f68':'#526977';context.textAlign='center';context.textBaseline='middle';
    lines.forEach((line,i)=>context.fillText(line,width/2,29+i*38));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return {texture,width,height};
  },[content,accent]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <sprite position={position} scale={[width*.035*scale,height*.035*scale,1]} renderOrder={20}><spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false}/></sprite>;
}
