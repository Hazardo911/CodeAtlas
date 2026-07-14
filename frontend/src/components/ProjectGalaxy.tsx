import {useEffect,useRef,useState} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import './ProjectGalaxy.css'
import './ProjectGalaxy3D.css'

type Kind='core'|'service'|'data'|'interface'
type Node={id:string;kind:Kind;pos:[number,number,number];files:number;language:string;description:string;owner:string;coverage:number;risk:'Low'|'Medium'|'High'}

const nodes:Node[]=[
 {id:'core',kind:'core',pos:[0,0,0],files:52,language:'TypeScript',description:'Shared domain logic and application orchestration.',owner:'Platform',coverage:86,risk:'Medium'},
 {id:'web',kind:'interface',pos:[4.4,2.2,-1.2],files:38,language:'React',description:'Customer-facing web application and UI routes.',owner:'Experience',coverage:81,risk:'Low'},
 {id:'auth',kind:'service',pos:[-2.4,3.2,.7],files:19,language:'TypeScript',description:'Identity, sessions, and permission enforcement.',owner:'Security',coverage:72,risk:'High'},
 {id:'api',kind:'service',pos:[3.8,-.7,1.2],files:31,language:'TypeScript',description:'Public API gateway and request orchestration.',owner:'Platform',coverage:79,risk:'Medium'},
 {id:'database',kind:'data',pos:[.2,-3.7,-.3],files:16,language:'SQL',description:'Persistence models, migrations, and query adapters.',owner:'Data',coverage:84,risk:'High'},
 {id:'shared',kind:'core',pos:[-4.4,1,-1.4],files:27,language:'TypeScript',description:'Types, utilities, and reusable project primitives.',owner:'Platform',coverage:93,risk:'Low'},
 {id:'workers',kind:'service',pos:[4.8,-3,0],files:14,language:'Node.js',description:'Asynchronous tasks and event processing.',owner:'Operations',coverage:68,risk:'Medium'},
 {id:'cli',kind:'interface',pos:[-4,-2.6,.8],files:11,language:'TypeScript',description:'Developer commands and local automation tools.',owner:'Developer Tools',coverage:88,risk:'Low'},
 {id:'cache',kind:'data',pos:[6,.4,-1.8],files:8,language:'Redis',description:'Fast session and application data caching.',owner:'Infrastructure',coverage:64,risk:'Medium'},
]
const edges:ReadonlyArray<readonly [string,string]>=[['core','web'],['core','auth'],['core','api'],['core','database'],['core','shared'],['core','cli'],['api','web'],['api','cache'],['api','workers'],['auth','web'],['auth','database'],['workers','database'],['shared','auth'],['shared','cli']]
const colors:Record<Kind,number>={core:0xb7ff2a,service:0xffb84d,data:0xff6b6b,interface:0x2dd4bf}

function label(text:string,color:number){
 const canvas=document.createElement('canvas');canvas.width=300;canvas.height=76
 const context=canvas.getContext('2d')!;context.font='700 25px Inter';context.textAlign='center';context.textBaseline='middle'
 context.fillStyle='rgba(4,6,4,.94)';context.roundRect(4,4,292,68,15);context.fill()
 context.strokeStyle=`#${color.toString(16).padStart(6,'0')}`;context.globalAlpha=.8;context.lineWidth=2;context.stroke();context.globalAlpha=1
 context.fillStyle='#f3f5f0';context.fillText(text.toUpperCase(),150,38)
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture
}

export default function ProjectGalaxy(){
 const mount=useRef<HTMLDivElement>(null)
 const cameraRef=useRef<THREE.PerspectiveCamera|null>(null),controlsRef=useRef<OrbitControls|null>(null)
 const objects=useRef(new Map<string,THREE.Group>()),links=useRef<Array<{mesh:THREE.Mesh;from:string;to:string}>>([])
 const [selected,setSelected]=useState('core'),[hovered,setHovered]=useState(''),[filter,setFilter]=useState<Kind|'all'>('all'),[zoom,setZoom]=useState(100),[orbiting,setOrbiting]=useState(true)
 const detail=nodes.find(node=>node.id===selected)??nodes[0]
 const connected=edges.filter(edge=>edge.includes(detail.id)).map(edge=>edge[0]===detail.id?edge[1]:edge[0])

 const focusNode=(id:string)=>{
  setSelected(id)
  const camera=cameraRef.current,controls=controlsRef.current,target=objects.current.get(id)
  if(!camera||!controls||!target)return
  controls.autoRotate=false;setOrbiting(false)
  const direction=camera.position.clone().sub(controls.target).normalize()
  controls.target.copy(target.position);camera.position.copy(target.position.clone().add(direction.multiplyScalar(8.5)));controls.update()
 }

 useEffect(()=>{
  const host=mount.current;if(!host)return
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x030503,.026)
  const camera=new THREE.PerspectiveCamera(46,1,.1,100);camera.position.set(0,2.8,15);cameraRef.current=camera
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x040604);renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enableZoom=false;controls.minDistance=7;controls.maxDistance=24;controls.autoRotate=true;controls.autoRotateSpeed=.28;controlsRef.current=controls
  controls.addEventListener('change',()=>setZoom(Math.round(1500/camera.position.distanceTo(controls.target))))
  scene.add(new THREE.AmbientLight(0xffffff,.52));const key=new THREE.PointLight(0xb7ff2a,34,24);key.position.set(1,3,5);scene.add(key);const fill=new THREE.PointLight(0x2dd4bf,18,20);fill.position.set(-5,-2,4);scene.add(fill)
  const grid=new THREE.GridHelper(22,22,0x26331f,0x111710);grid.position.y=-4.7;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.34;scene.add(grid)
  const starGeometry=new THREE.BufferGeometry(),starPositions=new Float32Array(2100);for(let i=0;i<starPositions.length;i++)starPositions[i]=(Math.random()-.5)*30;starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0x93a58d,size:.035,transparent:true,opacity:.72}));scene.add(stars)
  ;[3.6,5.8,7.4].forEach((radius,index)=>{const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.018,128),new THREE.MeshBasicMaterial({color:0x78935c,transparent:true,opacity:.22,side:THREE.DoubleSide}));ring.rotation.set(Math.PI/2.2,index*.36,index*.18);scene.add(ring)})

  const map=new Map<string,THREE.Group>();objects.current=map
  nodes.forEach(node=>{
   const group=new THREE.Group();group.position.set(...node.pos);group.userData={id:node.id}
   const radius=node.id==='core'?.7:.4+Math.min(node.files,50)*.004
   const planet=new THREE.Mesh(node.id==='core'?new THREE.IcosahedronGeometry(radius,2):new THREE.SphereGeometry(radius,28,28),new THREE.MeshStandardMaterial({color:0x0a0d09,emissive:colors[node.kind],emissiveIntensity:node.id==='core'?1.05:.72,roughness:.2,metalness:.32}));planet.userData={id:node.id};group.add(planet)
   group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(radius*1.28,1),new THREE.MeshBasicMaterial({color:colors[node.kind],wireframe:true,transparent:true,opacity:node.id==='core'?.64:.34})))
   const halo=new THREE.Mesh(new THREE.TorusGeometry(radius*1.62,.018,8,72),new THREE.MeshBasicMaterial({color:colors[node.kind],transparent:true,opacity:.62}));halo.rotation.x=Math.PI/2;group.add(halo)
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:label(node.id,colors[node.kind]),transparent:true,depthTest:false}));sprite.position.y=radius+.66;sprite.scale.set(2.05,.52,1);group.add(sprite)
   scene.add(group);map.set(node.id,group)
  })

  const flow:Array<{dot:THREE.Mesh;curve:THREE.QuadraticBezierCurve3;offset:number}>=[],lineList:Array<{mesh:THREE.Mesh;from:string;to:string}>=[];links.current=lineList
  edges.forEach(([from,to],index)=>{
   const a=nodes.find(node=>node.id===from)!,b=nodes.find(node=>node.id===to)!,start=new THREE.Vector3(...a.pos),end=new THREE.Vector3(...b.pos),mid=start.clone().lerp(end,.5).add(new THREE.Vector3(0,.45+index%3*.16,(index%2?1:-1)*.35)),curve=new THREE.QuadraticBezierCurve3(start,mid,end)
   const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.019,6),new THREE.MeshBasicMaterial({color:colors[a.kind],transparent:true,opacity:.38}));scene.add(tube);lineList.push({mesh:tube,from,to})
   for(let point=0;point<2;point++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.052,10,10),new THREE.MeshBasicMaterial({color:colors[b.kind]}));scene.add(dot);flow.push({dot,curve,offset:(point*.5+index*.071)%1})}
  })

  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0]
  const pick=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));raycaster.setFromCamera(pointer,camera);let hit=raycaster.intersectObjects([...map.values()],true)[0]?.object;while(hit&&!hit.userData.id)hit=hit.parent!;return hit?.userData.id as string|undefined}
  const move=(event:PointerEvent)=>{const id=pick(event)??'';setHovered(id);renderer.domElement.style.cursor=id?'pointer':'grab'}
  const pointerDown=(event:PointerEvent)=>{down=[event.clientX,event.clientY];controls.autoRotate=false;setOrbiting(false)}
  const pointerUp=(event:PointerEvent)=>{if(Math.hypot(event.clientX-down[0],event.clientY-down[1])<5){const id=pick(event);if(id)focusNode(id)}}
  renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp)
  const resize=()=>{const rect=host.getBoundingClientRect();camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height)},observer=new ResizeObserver(resize);observer.observe(host);resize()
  const started=performance.now();let frame=0
  const animate=()=>{frame=requestAnimationFrame(animate);const time=(performance.now()-started)/1000;controls.update();stars.rotation.y=time*.008;map.forEach((group,id)=>{group.rotation.y+=id==='core'?.006:.002;group.children[1].rotation.x+=.003});flow.forEach(item=>item.dot.position.copy(item.curve.getPoint((time*.12+item.offset)%1)));renderer.render(scene,camera)};animate()
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Sprite){object.geometry?.dispose?.();const material=object.material as THREE.Material|THREE.Material[];(Array.isArray(material)?material:[material]).forEach(value=>{if(value instanceof THREE.SpriteMaterial)value.map?.dispose();value.dispose()})}});renderer.dispose();renderer.domElement.remove()}
 },[])

 useEffect(()=>{
  objects.current.forEach((group,id)=>{const node=nodes.find(item=>item.id===id)!;group.visible=filter==='all'||node.kind===filter||id===selected;group.scale.setScalar(id===selected?1.32:id===hovered?1.16:1)})
  links.current.forEach(link=>{link.mesh.visible=(filter==='all'||nodes.find(node=>node.id===link.from)?.kind===filter||link.from===selected)&&(filter==='all'||nodes.find(node=>node.id===link.to)?.kind===filter||link.to===selected);(link.mesh.material as THREE.MeshBasicMaterial).opacity=link.from===selected||link.to===selected?.82:.22})
 },[filter,hovered,selected])

 const zoomBy=(factor:number)=>{const camera=cameraRef.current,controls=controlsRef.current;if(!camera||!controls)return;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update()}
 const reset=()=>{const camera=cameraRef.current,controls=controlsRef.current;if(!camera||!controls)return;camera.position.set(0,2.8,15);controls.target.set(0,0,0);controls.autoRotate=true;setOrbiting(true);setSelected('core');controls.update()}
 const toggleOrbit=()=>{const controls=controlsRef.current;if(!controls)return;controls.autoRotate=!orbiting;setOrbiting(value=>!value)}

 return <div className="project-galaxy galaxy-3d">
  <div className="galaxy-toolbar"><div><span className="galaxy-live"><i/>LIVE ARCHITECTURE</span><b>commerce-platform</b></div><div className="galaxy-filters">{(['all','core','service','data','interface'] as const).map(kind=><button className={filter===kind?'active':''} onClick={()=>setFilter(kind)} key={kind}>{kind}</button>)}</div><div className="galaxy-tools"><select value={selected} onChange={event=>focusNode(event.target.value)} aria-label="Focus module">{nodes.map(node=><option value={node.id} key={node.id}>{node.id}</option>)}</select><button onClick={toggleOrbit}>{orbiting?'Pause':'Orbit'}</button><button onClick={()=>zoomBy(1.15)}>−</button><span>{zoom}%</span><button onClick={()=>zoomBy(.86)}>+</button><button onClick={reset}>Reset</button></div></div>
  <div className="galaxy-workspace"><div className="galaxy-three-viewport" ref={mount}><div className="galaxy-scanline"/><div className="galaxy-mode"><i/>{orbiting?'AUTO ORBIT':'FOCUS MODE'}</div><div className="galaxy-telemetry"><small>PROJECT TOPOLOGY</small><b><i/>Dependency graph ready</b><div><span><strong>{nodes.length}</strong> modules</span><span><strong>{edges.length}</strong> connections</span><span><strong>4</strong> layers</span></div></div><div className="galaxy-selected-path"><small>SELECTED PATH</small><b>{detail.id}</b><span>→</span><em>{connected.slice(0,3).join(' · ')}</em></div><div className="galaxy-legend"><span><i className="core"/>Core</span><span><i className="service"/>Service</span><span><i className="data"/>Data</span><span><i className="interface"/>Interface</span></div><div className="galaxy-instruction">Drag to orbit · Select a module to focus · Use filters to isolate a layer</div></div>
   <aside className="galaxy-details"><div className={`detail-mark ${detail.kind}`}>{detail.id.slice(0,2)}</div><small>{detail.kind} module</small><h3>{detail.id}</h3><p>{detail.description}</p><dl><dt>Files</dt><dd>{detail.files}</dd><dt>Language</dt><dd>{detail.language}</dd><dt>Owner</dt><dd>{detail.owner}</dd><dt>Coverage</dt><dd>{detail.coverage}%</dd><dt>Connections</dt><dd>{connected.length}</dd><dt>Change risk</dt><dd className={`risk-${detail.risk.toLowerCase()}`}>{detail.risk}</dd></dl><button className="focus-module" onClick={()=>focusNode(detail.id)}>◎ Focus this module</button><div className="detail-deps"><span>CONNECTED MODULES</span>{connected.map(id=><button onClick={()=>focusNode(id)} key={id}>{id}<i>→</i></button>)}</div></aside>
  </div>
 </div>
}
