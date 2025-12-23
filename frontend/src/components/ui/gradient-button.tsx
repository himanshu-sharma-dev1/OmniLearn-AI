import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import * as React from "react"

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
    variant?: "primary" | "secondary" | "success" | "warning"
    size?: "sm" | "md" | "lg"
    children: React.ReactNode
    className?: string
    disabled?: boolean
}

const gradients = {
    primary: "from-indigo-500 via-purple-500 to-pink-500",
    secondary: "from-pink-500 via-red-500 to-orange-500",
    success: "from-emerald-500 via-teal-500 to-cyan-500",
    warning: "from-amber-500 via-orange-500 to-red-500",
}

const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
    ({ variant = "primary", size = "md", className, children, disabled, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileHover={disabled ? undefined : { scale: 1.03 }}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                className={cn(
                    "relative overflow-hidden rounded-lg font-semibold text-white",
                    "bg-gradient-to-r bg-200% animate-gradient",
                    "shadow-lg hover:shadow-xl transition-shadow duration-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none",
                    gradients[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled}
                {...props}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {children}
                </span>
            </motion.button>
        )
    }
)
GradientButton.displayName = "GradientButton"

export { GradientButton }
