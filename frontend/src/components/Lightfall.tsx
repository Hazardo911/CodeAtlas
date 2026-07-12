import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import './Lightfall.css'

type LightfallProps = {
  colors?: string[]
  backgroundColor?: string
  speed?: number
  streakCount?: number
  streakWidth?: number
  streakLength?: number
  glow?: number
  density?: number
  twinkle?: number
  zoom?: number
  backgroundGlow?: number
  opacity?: number
  mouseInteraction?: boolean
  mouseStrength?: number
  mouseRadius?: number
  className?: string
}

const hex = (value: string) => {
  const color = value.replace('#', '').padEnd(6, '0')
  return [
    parseInt(color.slice(0, 2), 16) / 255,
    parseInt(color.slice(2, 4), 16) / 255,
    parseInt(color.slice(4, 6), 16) / 255,
  ]
}

const vertex = `
attribute vec2 position;attribute vec2 uv;varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position,0.,1.);}`

const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;uniform vec2 uMouse;uniform float uTime;uniform float uSpeed;
uniform float uWidth;uniform float uLength;uniform float uGlow;uniform float uDensity;
uniform float uTwinkle;uniform float uZoom;uniform float uBgGlow;uniform float uOpacity;
uniform float uMouseStrength;uniform float uMouseRadius;uniform int uCount;
uniform vec3 uBg;uniform vec3 uC0;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;
vec3 palette(float h){int i=int(floor(clamp(h,0.,.999)*4.));if(i==0)return uC0;if(i==1)return uC1;if(i==2)return uC2;return uC3;}
vec3 tanhv(vec3 x){vec3 e=exp(-2.*x);return(1.-e)/(1.+e);}
vec2 sceneC(vec2 frag,vec2 r){
 vec2 P=(frag+frag-r)/r.x;float z=0.;float d=1e3;vec4 O=vec4(0.);
 for(int k=0;k<39;k++){if(d<=1e-4)break;O=z*normalize(vec4(P,uZoom,0.))-vec4(0.,4.,1.,0.)/4.5;d=1.-sqrt(length(O*O));z+=d;}
 return vec2(O.x,atan(O.z,O.y));
}
void main(){
 vec2 r=uResolution;vec2 C=vUv*r;vec2 uv0=(C+C-r)/r.x;
 float T=.1*uTime*uSpeed+9.;float rings=max(1.,floor(6.2831853*max(uDensity,.05)+.5));
 vec2 Y=vec2(.005,6.2831853/rings);vec2 c0=sceneC(C,r);vec2 cdx=sceneC(C+vec2(1.,0.),r);vec2 cdy=sceneC(C+vec2(0.,1.),r);
 vec2 dCx=cdx-c0;vec2 dCy=cdy-c0;dCx.y-=6.2831853*floor(dCx.y/6.2831853+.5);dCy.y-=6.2831853*floor(dCy.y/6.2831853+.5);
 vec2 fw=abs(dCx)+abs(dCy);C=c0;vec2 P=vec2(2.,1.)*uv0-(r/r.x)*vec2(0.,1.);
 vec4 O=vec4(uBg*90.*uBgGlow/(1e3*dot(P,P)+6.),0.);
 vec2 mouse=(uMouse+uMouse-1.)*vec2(r.x/r.y,1.);float md=length(uv0-mouse);
 float mouseGlow=exp(-md*md/max(uMouseRadius*uMouseRadius,1e-4))*uMouseStrength;O.rgb+=uC0*mouseGlow*.12;
 float zr=.0005*uWidth;vec2 rr=vec2(max(length(fw),1e-5));float tail=19./max(uLength,.05);
 for(int m=0;m<16;m++){
  if(m>=uCount)break;float jf=float(m)+1.;float ic=fract(sin(dot(vec2(jf,floor(C.x/Y.x+.5)),vec2(7.,11.))*73.));
  vec2 Pp=C-(T+T*ic)*vec2(0.,1.);Pp-=floor(Pp/Y+.5)*Y;float h=fract(8663.*ic);vec3 col=palette(h);
  float weight=mix(1.5,1.+sin(T+7.*h+4.),uTwinkle)*(1.+mouseGlow*1.3);
  vec2 inner=vec2(length(max(Pp,vec2(-1.,0.))),length(Pp)-zr)-zr;vec2 sm=vec2(1.)-smoothstep(-rr,rr,inner);
  O.rgb+=dot(sm,vec2(exp(tail*Pp.y),3.))*col*weight;C.x+=Y.x/8.;
 }
 vec3 result=sqrt(tanhv(max(O.rgb*uGlow-vec3(.04,.08,.02),0.)));
 gl_FragColor=vec4(result,uOpacity);
}`

export default function Lightfall({
  colors = ['#B7FF2A', '#FFB84D', '#FF6B6B', '#2DD4BF'],
  backgroundColor = '#050505',
  speed = 0.5,
  streakCount = 8,
  streakWidth = 1,
  streakLength = 1,
  glow = 0.65,
  density = 1,
  twinkle = 0.35,
  zoom = 2,
  backgroundGlow = 0.25,
  opacity = 0.58,
  mouseInteraction = true,
  mouseStrength = 0.22,
  mouseRadius = 0.75,
  className = '',
}: LightfallProps) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = container.current
    if (!host) return
    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 1.5),
      alpha: true,
      antialias: false,
    })
    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    host.appendChild(canvas)
    const list = [0, 1, 2, 3].map((index) => hex(colors[index] ?? colors[0] ?? '#B7FF2A'))
    const uniforms = {
      uResolution: { value: [1, 1] },
      uMouse: { value: [0.5, 0.5] },
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uWidth: { value: streakWidth },
      uLength: { value: streakLength },
      uGlow: { value: glow },
      uDensity: { value: density },
      uTwinkle: { value: twinkle },
      uZoom: { value: zoom },
      uBgGlow: { value: backgroundGlow },
      uOpacity: { value: opacity },
      uMouseStrength: { value: mouseInteraction ? mouseStrength : 0 },
      uMouseRadius: { value: mouseRadius },
      uCount: { value: Math.max(1, Math.min(16, Math.round(streakCount))) },
      uBg: { value: hex(backgroundColor) },
      uC0: { value: list[0] },
      uC1: { value: list[1] },
      uC2: { value: list[2] },
      uC3: { value: list[3] },
    }
    const program = new Program(gl, { vertex, fragment, uniforms })
    const geometry = new Triangle(gl)
    const mesh = new Mesh(gl, { geometry, program })
    const resize = () => {
      const rect = host.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      uniforms.uResolution.value = [rect.width, rect.height]
    }
    const pointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      uniforms.uMouse.value = [
        (event.clientX - rect.left) / rect.width,
        1 - (event.clientY - rect.top) / rect.height,
      ]
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    if (mouseInteraction) host.addEventListener('pointermove', pointer)
    let frame = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const render = (time: number) => {
      uniforms.uTime.value = reduce ? 0 : time * 0.001
      renderer.render({ scene: mesh })
      if (!reduce) frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('pointermove', pointer)
      canvas.remove()
      geometry.remove()
      program.remove()
    }
  }, [
    backgroundColor,
    backgroundGlow,
    colors,
    density,
    glow,
    mouseInteraction,
    mouseRadius,
    mouseStrength,
    opacity,
    speed,
    streakCount,
    streakLength,
    streakWidth,
    twinkle,
    zoom,
  ])
  return <div ref={container} className={`lightfall-container ${className}`} aria-hidden="true" />
}
