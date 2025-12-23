import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
    progress: number
    showPercentage?: boolean
    gradient?: boolean
    size?: "sm" | "md" | "lg"
    className?: string
}

const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
}

export function ProgressBar({
    progress,
    showPercentage = true,
    gradient = true,
    size = "md",
    className
}: ProgressBarProps) {
    const clampedProgress = Math.min(100, Math.max(0, progress))

    return (
        <div className={cn("w-full", className)}>
            {showPercentage && (
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Progress</span>
                    <motion.span
                        className="text-sm font-semibold text-primary"
                        key={Math.round(clampedProgress)}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {Math.round(clampedProgress)}%
                    </motion.span>
                </div>
            )}
            <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[size])}>
                <motion.div
                    className={cn(
                        "h-full rounded-full",
                        gradient
                            ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                            : "bg-primary"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </div>
    )
}
