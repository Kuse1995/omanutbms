import { cn } from "@/lib/utils";

interface NumberedBodySVGProps {
  view: 'front' | 'back';
  highlightedNumber?: number | null;
  onNumberClick?: (number: number) => void;
  className?: string;
}

// Measurement point positions for front view
const FRONT_POINTS = [
  { number: 1, x: 100, y: 42, label: 'Neck' },
  { number: 2, x: 100, y: 70, label: 'Across Front' },
  { number: 3, x: 55, y: 90, label: 'Bust' },
  { number: 4, x: 55, y: 110, label: 'Under Bust' },
  { number: 5, x: 55, y: 135, label: 'Waist' },
  { number: 6, x: 50, y: 175, label: 'Hip' },
  { number: 7, x: 75, y: 225, label: 'Thigh' },
  { number: 8, x: 35, y: 95, label: 'Upper Arm' },
  { number: 9, x: 25, y: 145, label: 'Elbow' },
  { number: 10, x: 20, y: 190, label: 'Wrist' },
  { number: 16, x: 42, y: 120, label: 'Arm Length' },
  { number: 17, x: 85, y: 355, label: 'Ankle' },
];

// Measurement point positions for back view
const BACK_POINTS = [
  { number: 11, x: 100, y: 80, label: 'Shoulder to Waist' },
  { number: 12, x: 145, y: 200, label: 'Shoulder to Floor' },
  { number: 13, x: 100, y: 55, label: 'Shoulder to Shoulder' },
  { number: 14, x: 100, y: 42, label: 'Back Neck to Waist' },
  { number: 15, x: 100, y: 75, label: 'Across Back' },
];

export function NumberedBodySVG({ 
  view, 
  highlightedNumber, 
  onNumberClick,
  className 
}: NumberedBodySVGProps) {
  const points = view === 'front' ? FRONT_POINTS : BACK_POINTS;
  
  const isHighlighted = (num: number) => highlightedNumber === num;

  const circleClass = (num: number) => cn(
    "cursor-pointer transition-all duration-200",
    isHighlighted(num) 
      ? "fill-primary stroke-primary" 
      : "fill-muted stroke-muted-foreground/60 hover:fill-primary/20 hover:stroke-primary"
  );

  const textClass = (num: number) => cn(
    "text-[9px] font-semibold pointer-events-none transition-colors duration-200",
    isHighlighted(num) 
      ? "fill-primary-foreground" 
      : "fill-foreground"
  );

  const lineClass = (num: number) => cn(
    "transition-colors duration-200",
    isHighlighted(num) 
      ? "stroke-primary stroke-[1.5]" 
      : "stroke-muted-foreground/40 stroke-[1]"
  );

  return (
    <svg 
      viewBox="0 0 200 380" 
      className={cn("w-full", className)}
      role="img"
      aria-label={`${view} view measurement guide`}
    >
      {/* Body Silhouette */}
      <g className="fill-muted/40 stroke-muted-foreground/50 stroke-[1.5]">
        {/* Head */}
        <ellipse cx="100" cy="22" rx="15" ry="18" />
        
        {/* Neck */}
        <path d="M92,40 L92,52 L108,52 L108,40" className="fill-muted/30" />
        
        {/* Torso */}
        <path
          d="M70,52
             C60,58 50,70 45,95
             L40,130
             L42,160
             L50,180
             L55,200
             L100,210
             L145,200
             L150,180
             L158,160
             L160,130
             L155,95
             C150,70 140,58 130,52
             Z"
        />
        
        {/* Left Arm */}
        <path
          d="M45,70
             C30,75 25,85 20,95
             L15,130
             L12,160
             L10,190
             L8,195
             L25,200
             L28,170
             L32,140
             L38,110
             L50,85
             Z"
          className="fill-muted/30"
        />
        
        {/* Right Arm */}
        <path
          d="M155,70
             C170,75 175,85 180,95
             L185,130
             L188,160
             L190,190
             L192,195
             L175,200
             L172,170
             L168,140
             L162,110
             L150,85
             Z"
          className="fill-muted/30"
        />
        
        {/* Left Leg */}
        <path
          d="M55,200
             L52,240
             L50,280
             L50,320
             L55,360
             L85,360
             L88,320
             L90,280
             L92,240
             L95,210
             Z"
        />
        
        {/* Right Leg */}
        <path
          d="M105,210
             L108,240
             L110,280
             L112,320
             L115,360
             L145,360
             L150,320
             L150,280
             L148,240
             L145,200
             Z"
        />
      </g>

      {/* Measurement Guide Lines & Points */}
      {points.map(point => {
        // Offset position for the number circle
        const offsetX = point.x < 100 ? point.x - 25 : point.x + 25;
        const offsetY = point.y;
        
        return (
          <g key={point.number}>
            {/* Leader line from point to number */}
            <line
              x1={point.x}
              y1={point.y}
              x2={offsetX}
              y2={offsetY}
              className={lineClass(point.number)}
              strokeDasharray="3,2"
            />
            
            {/* Measurement point on body */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              className={cn(
                "transition-all duration-200",
                isHighlighted(point.number) 
                  ? "fill-primary stroke-primary stroke-[2]" 
                  : "fill-background stroke-muted-foreground/60 stroke-[1]"
              )}
            />
            
            {/* Number circle */}
            <circle
              cx={offsetX}
              cy={offsetY}
              r="11"
              className={circleClass(point.number)}
              onClick={() => onNumberClick?.(point.number)}
            />
            
            {/* Number text */}
            <text
              x={offsetX}
              y={offsetY + 3}
              textAnchor="middle"
              className={textClass(point.number)}
            >
              {point.number}
            </text>
          </g>
        );
      })}

      {/* View label */}
      <text
        x="100"
        y="375"
        textAnchor="middle"
        className="text-[10px] fill-muted-foreground font-medium uppercase tracking-wider"
      >
        {view === 'front' ? 'Front View' : 'Back View'}
      </text>
    </svg>
  );
}
