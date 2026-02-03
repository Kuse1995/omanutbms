import { cn } from "@/lib/utils";

interface UpperBodySVGProps {
  highlightedArea?: string | null;
  onAreaClick?: (area: string) => void;
  className?: string;
}

export function UpperBodySVG({ highlightedArea, onAreaClick, className }: UpperBodySVGProps) {
  const isHighlighted = (area: string) => highlightedArea === area;
  
  const regionClass = (area: string) => cn(
    "transition-all duration-200 cursor-pointer",
    isHighlighted(area) 
      ? "fill-primary/20 stroke-primary stroke-[2]" 
      : "fill-transparent stroke-muted-foreground/40 stroke-[1]"
  );

  const labelClass = (area: string) => cn(
    "text-[8px] transition-colors duration-200 pointer-events-none",
    isHighlighted(area) 
      ? "fill-primary font-medium" 
      : "fill-muted-foreground"
  );

  const lineClass = (area: string) => cn(
    "transition-colors duration-200",
    isHighlighted(area) 
      ? "stroke-primary" 
      : "stroke-muted-foreground/30"
  );

  return (
    <svg 
      viewBox="0 0 200 280" 
      className={cn("w-full max-w-[160px]", className)}
      role="img"
      aria-label="Upper body measurement guide"
    >
      {/* Body outline */}
      <path
        d="M100,25 
           C115,25 125,35 125,50
           L130,55
           C145,60 160,70 165,85
           L175,120
           C178,130 175,140 170,145
           L165,150
           L170,200
           C172,220 168,240 160,260
           L40,260
           C32,240 28,220 30,200
           L35,150
           L30,145
           C25,140 22,130 25,120
           L35,85
           C40,70 55,60 70,55
           L75,50
           C75,35 85,25 100,25Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Head */}
      <ellipse cx="100" cy="18" rx="12" ry="14" className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]" />
      
      {/* Neck region */}
      <ellipse 
        cx="100" cy="42" rx="12" ry="8"
        className={regionClass('neck')}
        onClick={() => onAreaClick?.('neck')}
      />
      <line x1="112" y1="42" x2="145" y2="35" className={lineClass('neck')} strokeDasharray="2,2" />
      <text x="147" y="38" className={labelClass('neck')}>Neck</text>
      
      {/* Shoulder region */}
      <path
        d="M70,55 Q85,50 100,50 Q115,50 130,55"
        className={regionClass('shoulder')}
        onClick={() => onAreaClick?.('shoulder')}
      />
      <line x1="130" y1="55" x2="155" y2="50" className={lineClass('shoulder')} strokeDasharray="2,2" />
      <text x="157" y="53" className={labelClass('shoulder')}>Shoulder</text>
      
      {/* Armhole region - left */}
      <ellipse 
        cx="48" cy="95" rx="15" ry="25"
        className={regionClass('armhole')}
        onClick={() => onAreaClick?.('armhole')}
      />
      
      {/* Armhole region - right */}
      <ellipse 
        cx="152" cy="95" rx="15" ry="25"
        className={regionClass('armhole')}
        onClick={() => onAreaClick?.('armhole')}
      />
      <line x1="167" y1="95" x2="185" y2="85" className={lineClass('armhole')} strokeDasharray="2,2" />
      <text x="157" y="75" className={labelClass('armhole')}>Armhole</text>
      
      {/* Sleeve length indicator */}
      <path
        d="M165,85 L175,120 L180,155"
        className={cn(regionClass('sleeve'), "fill-none")}
        onClick={() => onAreaClick?.('sleeve')}
      />
      <line x1="180" y1="155" x2="190" y2="145" className={lineClass('sleeve')} strokeDasharray="2,2" />
      <text x="175" y="165" className={labelClass('sleeve')}>Sleeve</text>
      
      {/* Cuff indicator */}
      <ellipse 
        cx="182" cy="165" rx="8" ry="5"
        className={regionClass('cuff')}
        onClick={() => onAreaClick?.('cuff')}
      />
      
      {/* Bust/Chest region */}
      <ellipse 
        cx="100" cy="95" rx="42" ry="15"
        className={regionClass('bust')}
        onClick={() => onAreaClick?.('bust')}
      />
      <ellipse 
        cx="100" cy="95" rx="42" ry="15"
        className={regionClass('chest')}
        onClick={() => onAreaClick?.('chest')}
      />
      <line x1="58" y1="95" x2="15" y2="95" className={lineClass('bust')} strokeDasharray="2,2" />
      <text x="5" y="98" className={labelClass('bust')}>Bust</text>
      
      {/* Under-bust region */}
      <ellipse 
        cx="100" cy="115" rx="38" ry="10"
        className={regionClass('under-bust')}
        onClick={() => onAreaClick?.('under-bust')}
      />
      <line x1="62" y1="115" x2="15" y2="115" className={lineClass('under-bust')} strokeDasharray="2,2" />
      <text x="5" y="118" className={labelClass('under-bust')}>U.Bust</text>
      
      {/* Waist region */}
      <ellipse 
        cx="100" cy="145" rx="32" ry="12"
        className={regionClass('waist')}
        onClick={() => onAreaClick?.('waist')}
      />
      <line x1="68" y1="145" x2="15" y2="145" className={lineClass('waist')} strokeDasharray="2,2" />
      <text x="5" y="148" className={labelClass('waist')}>Waist</text>
      
      {/* Hip region */}
      <ellipse 
        cx="100" cy="190" rx="45" ry="18"
        className={regionClass('hip')}
        onClick={() => onAreaClick?.('hip')}
      />
      <line x1="55" y1="190" x2="15" y2="190" className={lineClass('hip')} strokeDasharray="2,2" />
      <text x="5" y="193" className={labelClass('hip')}>Hip</text>
      
      {/* Full length indicator */}
      <line 
        x1="170" y1="50" x2="170" y2="255" 
        className={cn(lineClass('full-length'), "stroke-[1.5]")}
        strokeDasharray="4,2"
        onClick={() => onAreaClick?.('full-length')}
        style={{ cursor: 'pointer' }}
      />
      <text x="173" y="155" className={labelClass('full-length')} transform="rotate(90, 173, 155)">Full Length</text>
    </svg>
  );
}
