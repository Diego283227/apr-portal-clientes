import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  /**
   * Unique key for the current page/view
   */
  pageKey: string;
  /**
   * Animation type: 'fade' | 'slide' | 'scale'
   */
  type?: 'fade' | 'slide' | 'scale';
  /**
   * Duration in seconds
   */
  duration?: number;
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  }
};

export default function PageTransition({
  children,
  pageKey,
  type = 'fade',
  duration = 0.3
}: PageTransitionProps) {
  const selectedVariant = variants[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={selectedVariant.initial}
        animate={selectedVariant.animate}
        exit={selectedVariant.exit}
        transition={{
          duration,
          ease: 'easeInOut'
        }}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
