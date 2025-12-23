import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type AnimationType = "bounce" | "spin" | "pulse" | "wiggle" | "float"

interface AnimatedIconProps {
    icon: LucideIcon
    size?: number
    className?: string
    animation?: AnimationType
    color?: string
}

const animations = {
    bounce: { y: [0, -6, 0] },
    spin: { rotate: 360 },
    pulse: { scale: [1, 1.15, 1] },
    wiggle: { rotate: [-5, 5, -5, 5, 0] },
    float: { y: [0, -4, 0] },
}

const transitions = {
    bounce: { duration: 0.5, ease: "easeInOut" },
    spin: { duration: 0.6, ease: "easeInOut" },
    pulse: { duration: 0.4, ease: "easeInOut" },
    wiggle: { duration: 0.5, ease: "easeInOut" },
    float: { duration: 2, repeat: Infinity, ease: "easeInOut" },
}

export function AnimatedIcon({
    icon: Icon,
    size = 24,
    className,
    animation = "bounce",
    color
}: AnimatedIconProps) {
    return (
        <motion.div
            whileHover={animation !== "float" ? animations[animation] : undefined}
            animate={animation === "float" ? animations[animation] : undefined}
            transition={transitions[animation]}
            className={cn("inline-flex", className)}
            style={{ color }}
        >
            <Icon size={size} />
        </motion.div>
    )
}
