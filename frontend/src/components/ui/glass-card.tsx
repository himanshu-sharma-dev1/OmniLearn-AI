import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"
import * as React from "react"

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
    hover?: boolean
    glow?: boolean
    children: React.ReactNode
    className?: string
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hover = true, glow = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                whileHover={hover ? { y: -5, scale: 1.01 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                    "relative rounded-xl p-6",
                    "bg-[var(--glass-bg)] dark:bg-slate-900/80",
                    "backdrop-blur-xl backdrop-saturate-150",
                    "border border-white/20 dark:border-slate-700/50",
                    "shadow-xl shadow-black/5 dark:shadow-black/20",
                    hover && "transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10",
                    glow && "animate-glow",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
