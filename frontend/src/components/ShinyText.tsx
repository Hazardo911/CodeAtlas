import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import './ShinyText.css'

type ShinyTextProps = {
  text: string
  disabled?: boolean
  speed?: number
  delay?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  yoyo?: boolean
  pauseOnHover?: boolean
  direction?: 'left' | 'right'
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3.8,
  delay = 1.2,
  className = '',
  color = '#f2f4ef',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
}: ShinyTextProps) {
  const [isPaused, setIsPaused] = useState(false)
  const progress = useMotionValue(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const directionRef = useRef(direction === 'left' ? 1 : -1)
  const animationDuration = speed * 1000
  const delayDuration = delay * 1000

  useAnimationFrame(time => {
    if (disabled || isPaused) {
      lastTimeRef.current = null
      return
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }
    elapsedRef.current += time - lastTimeRef.current
    lastTimeRef.current = time
    const cycleDuration = animationDuration + delayDuration

    if (yoyo) {
      const cycleTime = elapsedRef.current % (cycleDuration * 2)
      if (cycleTime < animationDuration) progress.set((cycleTime / animationDuration) * 100)
      else if (cycleTime < cycleDuration) progress.set(100)
      else if (cycleTime < cycleDuration + animationDuration) progress.set(100 - ((cycleTime - cycleDuration) / animationDuration) * 100)
      else progress.set(0)
    } else {
      const cycleTime = elapsedRef.current % cycleDuration
      progress.set(cycleTime < animationDuration ? (cycleTime / animationDuration) * 100 : 100)
    }
  })

  useEffect(() => {
    directionRef.current = direction === 'left' ? 1 : -1
    elapsedRef.current = 0
    progress.set(direction === 'left' ? 0 : 100)
  }, [direction, progress])

  const backgroundPosition = useTransform(progress, value => {
    const position = directionRef.current === 1 ? 150 - value * 2 : -50 + value * 2
    return `${position}% center`
  })
  const handleMouseEnter = useCallback(() => { if (pauseOnHover) setIsPaused(true) }, [pauseOnHover])
  const handleMouseLeave = useCallback(() => { if (pauseOnHover) setIsPaused(false) }, [pauseOnHover])
  const gradient = `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`

  return <motion.span
    className={`shiny-text ${className}`}
    style={{backgroundImage:gradient,backgroundSize:'200% auto',backgroundPosition,WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent'}}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
  >{text}</motion.span>
}
