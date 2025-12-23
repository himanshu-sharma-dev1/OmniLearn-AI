import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    animate?: boolean
}

function Skeleton({
    className,
    animate = true,
    ...props
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-md bg-muted",
                animate && [
                    "before:absolute before:inset-0",
                    "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
                    "before:animate-shimmer before:bg-[length:200%_100%]",
                ],
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
