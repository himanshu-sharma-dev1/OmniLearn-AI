import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.98
    },
}

const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3
}

interface PageTransitionProps {
    children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="min-h-screen"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
