"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useTheme } from "next-themes"

export function InteractiveBackground() {
    const { resolvedTheme } = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)

    // Mouse position trackers
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Smooth springs for different layers (parallax effect)
    const springConfig = { damping: 25, stiffness: 50, mass: 1.5 } // Smooth, slightly floaty

    // Layer 1: Primary blob (Moves moderately)
    const x1 = useSpring(useTransform(mouseX, [0, 1], [-50, 50]), springConfig)
    const y1 = useSpring(useTransform(mouseY, [0, 1], [-50, 50]), springConfig)

    // Layer 2: Secondary blob (Moves slower - feels further away)
    const x2 = useSpring(useTransform(mouseX, [0, 1], [30, -30]), springConfig)
    const y2 = useSpring(useTransform(mouseY, [0, 1], [30, -30]), springConfig)

    // Layer 3: Accent blob (Moves fastest - feels closer)
    const x3 = useSpring(useTransform(mouseX, [0, 1], [-80, 80]), springConfig)
    const y3 = useSpring(useTransform(mouseY, [0, 1], [-80, 80]), springConfig)


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { innerWidth, innerHeight } = window
            // Normalize coordinates to -1 to 1 for easier calculations relative to center
            const x = (e.clientX / innerWidth)
            const y = (e.clientY / innerHeight)

            mouseX.set(x)
            mouseY.set(y)
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [mouseX, mouseY])

    // Dynamic coloring based on theme (though CSS vars tackle this usually, we can adjust opacity here)
    const isDark = resolvedTheme === "dark"
    const opacity = isDark ? 0.35 : 0.45

    // Spotlight follower
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        })

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const spotlightX = useSpring(useTransform(mouseX, [0, 1], [-200, dimensions.width - 200]), { damping: 40, stiffness: 200 })
    const spotlightY = useSpring(useTransform(mouseY, [0, 1], [-200, dimensions.height - 200]), { damping: 40, stiffness: 200 })

    if (!isMounted) return null

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 overflow-hidden pointer-events-none -z-30 w-full h-full"
            aria-hidden="true"
        >
            {/* Primary Blob (Top Left) */}
            <motion.div
                style={{ x: x1, y: y1, opacity }}
                className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] min-w-[300px] min-h-[300px] bg-primary/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] md:blur-[120px]"
                animate={{
                    scale: [1, 1.1, 0.9, 1],
                    rotate: [0, 20, -10, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
            />

            {/* Secondary Blob (Right Center) */}
            <motion.div
                style={{ x: x2, y: y2, opacity }}
                className="absolute top-[30%] -right-[10%] w-[40vw] h-[40vw] min-w-[250px] min-h-[250px] bg-secondary/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] md:blur-[100px]"
                animate={{
                    scale: [0.9, 1.1, 0.95, 0.9],
                    translateY: [0, -40, 20, 0]
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            {/* Accent Blob (Bottom Left) */}
            <motion.div
                style={{ x: x3, y: y3, opacity }}
                className="absolute -bottom-[20%] left-[20%] w-[45vw] h-[45vw] min-w-[280px] min-h-[280px] bg-accent/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] md:blur-[110px]"
                animate={{
                    scale: [1, 1.05, 0.95, 1],
                    translateX: [0, 30, -30, 0]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: 5
                }}
            />

            {/* Mouse Follower "Spotlight" */}
            <motion.div
                className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[60px] pointer-events-none hidden md:block"
                style={{
                    x: spotlightX,
                    y: spotlightY,
                    top: 0,
                    left: 0
                }}
            />
        </div>
    )
}
