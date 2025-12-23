import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg"
    text?: string
    className?: string
}

const sizes = {
    sm: { container: 24, ring: 2 },
    md: { container: 40, ring: 3 },
    lg: { container: 56, ring: 4 }
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
    const { container, ring } = sizes[size]

    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative" style={{ width: container, height: container }}>
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border-transparent"
                        style={{
                            width: container - i * 10,
                            height: container - i * 10,
                            top: i * 5,
                            left: i * 5,
                            borderWidth: ring - i * 0.5,
                            borderTopColor: `hsl(${243 + i * 30}, 75%, ${58 + i * 10}%)`,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 1.2 - i * 0.2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </div>
            {text && (
                <motion.p
                    className="text-muted-foreground text-sm font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    )
}
