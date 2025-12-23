import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
    className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{
                        y: [0, -8, 0],
                        opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    )
}
