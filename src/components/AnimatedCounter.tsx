import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 2, className }: AnimatedCounterProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Parse the value to extract numeric part and suffix
  const parseValue = (val: string) => {
    // Handle percentage values like "99.999999%"
    const percentMatch = val.match(/^([\d.]+)(%?)$/);
    if (percentMatch) {
      return {
        numericValue: parseFloat(percentMatch[1]),
        suffix: percentMatch[2],
        prefix: "",
        decimals: (percentMatch[1].split('.')[1] || '').length
      };
    }
    
    // Handle plain numbers like "0"
    const numMatch = val.match(/^(\d+)$/);
    if (numMatch) {
      return {
        numericValue: parseInt(numMatch[1]),
        suffix: "",
        prefix: "",
        decimals: 0
      };
    }
    
    return null;
  };

  const parsed = parseValue(value);
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(parsed ? "0" : value);

  useEffect(() => {
    if (!parsed || hasAnimated) return;

    const controls = animate(count, parsed.numericValue, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (parsed.decimals > 0) {
          setDisplayValue(latest.toFixed(parsed.decimals));
        } else {
          setDisplayValue(Math.floor(latest).toString());
        }
      },
      onComplete: () => setHasAnimated(true)
    });

    return () => controls.stop();
  }, [parsed, hasAnimated, duration]);

  // If we couldn't parse, just show the original value
  if (!parsed) {
    return <span className={className}>{value}</span>;
  }

  return (
    <motion.span className={className}>
      {parsed.prefix}{displayValue}{parsed.suffix}
    </motion.span>
  );
}
