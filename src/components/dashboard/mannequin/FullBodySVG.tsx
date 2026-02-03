import { cn } from "@/lib/utils";

interface FullBodySVGProps {
  highlightedArea?: string | null;
  onAreaClick?: (area: string) => void;
  className?: string;
}

export function FullBodySVG({ highlightedArea, onAreaClick, className }: FullBodySVGProps) {
  const isHighlighted = (area: string) => highlightedArea === area;
  
  const regionClass = (area: string) => cn(
    "transition-all duration-200 cursor-pointer",
    isHighlighted(area) 
      ? "fill-primary/20 stroke-primary stroke-[2]" 
      : "fill-transparent stroke-muted-foreground/40 stroke-[1]"
  );

  const labelClass = (area: string) => cn(
    "text-[7px] transition-colors duration-200 pointer-events-none",
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
      viewBox="0 0 200 400" 
      className={cn("w-full max-w-[140px]", className)}
      role="img"
      aria-label="Full body measurement guide"
    >
      {/* Head */}
      <ellipse cx="100" cy="18" rx="10" ry="12" className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]" />
      
      {/* Upper body */}
      <path
        d="M100,30 
           C112,30 120,38 120,48
           L125,52
           C138,56 148,65 152,78
           L158,105
           C160,112 158,118 154,122
           L152,125
           L155,165
           C156,175 154,182 150,188
           L130,190
           L128,195
           L100,200
           L72,195
           L70,190
           L50,188
           C46,182 44,175 45,165
           L48,125
           L46,122
           C42,118 40,112 42,105
           L48,78
           C52,65 62,56 75,52
           L80,48
           C80,38 88,30 100,30Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Left arm */}
      <path
        d="M48,78 L35,105 L28,140 L25,175"
        className="fill-none stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Right arm */}
      <path
        d="M152,78 L165,105 L172,140 L175,175"
        className="fill-none stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Lower body / Skirt area */}
      <path
        d="M50,188 
           L45,220
           L42,260
           L40,300
           L42,340
           L45,380
           L155,380
           L158,340
           L160,300
           L158,260
           L155,220
           L150,188
           Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Neck region */}
      <ellipse 
        cx="100" cy="38" rx="10" ry="6"
        className={regionClass('neck')}
        onClick={() => onAreaClick?.('neck')}
      />
      <line x1="110" y1="38" x2="140" y2="32" className={lineClass('neck')} strokeDasharray="2,2" />
      <text x="142" y="35" className={labelClass('neck')}>Neck</text>
      
      {/* Shoulder region */}
      <path
        d="M75,52 Q87,48 100,48 Q113,48 125,52"
        className={regionClass('shoulder')}
        onClick={() => onAreaClick?.('shoulder')}
      />
      <line x1="125" y1="52" x2="148" y2="45" className={lineClass('shoulder')} strokeDasharray="2,2" />
      <text x="150" y="48" className={labelClass('shoulder')}>Shoulder</text>
      
      {/* Sleeve indicator */}
      <path
        d="M152,78 L165,105 L172,140 L175,175"
        className={cn(regionClass('sleeve'), "fill-none")}
        onClick={() => onAreaClick?.('sleeve')}
      />
      <line x1="175" y1="175" x2="185" y2="165" className={lineClass('sleeve')} strokeDasharray="2,2" />
      <text x="172" y="182" className={labelClass('sleeve')}>Sleeve</text>
      
      {/* Cuff */}
      <ellipse 
        cx="175" cy="178" rx="6" ry="4"
        className={regionClass('cuff')}
        onClick={() => onAreaClick?.('cuff')}
      />
      
      {/* Armhole */}
      <ellipse 
        cx="145" cy="85" rx="12" ry="18"
        className={regionClass('armhole')}
        onClick={() => onAreaClick?.('armhole')}
      />
      <line x1="157" y1="85" x2="178" y2="78" className={lineClass('armhole')} strokeDasharray="2,2" />
      <text x="165" y="72" className={labelClass('armhole')}>Armhole</text>
      
      {/* Bust region */}
      <ellipse 
        cx="100" cy="88" rx="35" ry="12"
        className={regionClass('bust')}
        onClick={() => onAreaClick?.('bust')}
      />
      <line x1="65" y1="88" x2="15" y2="88" className={lineClass('bust')} strokeDasharray="2,2" />
      <text x="5" y="91" className={labelClass('bust')}>Bust</text>
      
      {/* Under-bust region */}
      <ellipse 
        cx="100" cy="105" rx="32" ry="8"
        className={regionClass('under-bust')}
        onClick={() => onAreaClick?.('under-bust')}
      />
      <line x1="68" y1="105" x2="15" y2="105" className={lineClass('under-bust')} strokeDasharray="2,2" />
      <text x="5" y="108" className={labelClass('under-bust')}>U.Bust</text>
      
      {/* Waist region */}
      <ellipse 
        cx="100" cy="130" rx="28" ry="10"
        className={regionClass('waist')}
        onClick={() => onAreaClick?.('waist')}
      />
      <line x1="72" y1="130" x2="15" y2="130" className={lineClass('waist')} strokeDasharray="2,2" />
      <text x="5" y="133" className={labelClass('waist')}>Waist</text>
      
      {/* Hip region */}
      <ellipse 
        cx="100" cy="195" rx="40" ry="14"
        className={regionClass('hip')}
        onClick={() => onAreaClick?.('hip')}
      />
      <line x1="60" y1="195" x2="15" y2="195" className={lineClass('hip')} strokeDasharray="2,2" />
      <text x="5" y="198" className={labelClass('hip')}>Hip</text>
      
      {/* Knee region */}
      <ellipse 
        cx="100" cy="300" rx="45" ry="10"
        className={regionClass('knee')}
        onClick={() => onAreaClick?.('knee')}
      />
      <line x1="55" y1="300" x2="15" y2="300" className={lineClass('knee')} strokeDasharray="2,2" />
      <text x="5" y="303" className={labelClass('knee')}>Knee</text>
      
      {/* Ankle/Hem region */}
      <ellipse 
        cx="100" cy="375" rx="50" ry="8"
        className={regionClass('ankle')}
        onClick={() => onAreaClick?.('ankle')}
      />
      <line x1="50" y1="375" x2="15" y2="375" className={lineClass('ankle')} strokeDasharray="2,2" />
      <text x="5" y="378" className={labelClass('ankle')}>Hem</text>
      
      {/* Full length indicator */}
      <line 
        x1="180" y1="48" x2="180" y2="375" 
        className={cn(lineClass('full-length'), "stroke-[1.5]")}
        strokeDasharray="4,2"
        onClick={() => onAreaClick?.('full-length')}
        style={{ cursor: 'pointer' }}
      />
      <text x="183" y="210" className={labelClass('full-length')} transform="rotate(90, 183, 210)">Full Length</text>
      
      {/* Back slit indicator */}
      <line 
        x1="100" y1="375" x2="100" y2="340" 
        className={cn(lineClass('back-slit'), "stroke-[1.5]")}
        strokeDasharray="3,2"
        onClick={() => onAreaClick?.('back-slit')}
        style={{ cursor: 'pointer' }}
      />
    </svg>
  );
}
