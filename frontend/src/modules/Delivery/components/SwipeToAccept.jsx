import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiCheck } from 'react-icons/fi';

const SwipeToAccept = ({ onAccept, isLoading = false, label = 'Swipe to Accept' }) => {
    const [accepted, setAccepted] = useState(false);
    const containerRef = useRef(null);
    const handleRef = useRef(null);
    const x = useMotionValue(0);
    const controls = useAnimation();

    const [rightConstraint, setRightConstraint] = useState(0);

    useEffect(() => {
        if (containerRef.current && handleRef.current) {
            const parentWidth = containerRef.current.offsetWidth;
            const childWidth = handleRef.current.offsetWidth;
            setRightConstraint(parentWidth - childWidth);
        }
    }, []);

    const handleDragEnd = async (event, info) => {
        if (isLoading || accepted || rightConstraint <= 0) return;

        // If swiped more than 70% of the way, trigger accept
        if (info.offset.x > rightConstraint * 0.7) {
            controls.start({ x: rightConstraint, transition: { type: 'spring', stiffness: 300, damping: 20 } });
            setAccepted(true);
            if (onAccept) {
                await onAccept();
            }
        } else {
            // Snap back if didn't swipe far enough
            controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
        }
    };

    const textOpacity = useTransform(x, [0, rightConstraint / 2 || 100], [1, 0]);

    const bg = useTransform(
        x,
        [0, rightConstraint || 100],
        ['rgb(243, 244, 246)', 'rgb(220, 252, 231)']
    );

    return (
        <motion.div
            ref={containerRef}
            style={{ background: accepted ? 'rgb(16, 185, 129)' : bg }}
            className={`relative w-full h-14 rounded-full overflow-hidden flex items-center shadow-inner ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
        >
            <motion.div
                style={{ opacity: accepted ? 0 : textOpacity }}
                className="absolute inset-0 flex items-center justify-center font-bold text-gray-500 z-0 pointer-events-none"
            >
                {isLoading ? 'Accepting...' : label}
            </motion.div>

            <motion.div
                ref={handleRef}
                drag={accepted || isLoading ? false : "x"}
                dragConstraints={{ left: 0, right: rightConstraint }}
                dragElastic={0.05}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className={`absolute left-0 h-full aspect-square p-1 z-10 cursor-grab active:cursor-grabbing`}
            >
                <div className={`w-full h-full rounded-full flex items-center justify-center shadow-md transition-colors ${accepted ? 'bg-white text-green-500' : 'gradient-green text-white'}`}>
                    {accepted ? <FiCheck size={24} /> : <FiChevronRight size={24} />}
                </div>
            </motion.div>

            <AnimatePresence>
                {accepted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center font-bold text-white z-0 pointer-events-none"
                    >
                        Accepted!
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SwipeToAccept;
