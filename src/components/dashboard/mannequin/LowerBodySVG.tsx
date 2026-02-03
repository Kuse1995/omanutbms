import { cn } from "@/lib/utils";

interface LowerBodySVGProps {
  highlightedArea?: string | null;
  onAreaClick?: (area: string) => void;
  className?: string;
}

export function LowerBodySVG({ highlightedArea, onAreaClick, className }: LowerBodySVGProps) {
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
      viewBox="0 0 200 320" 
      className={cn("w-full max-w-[160px]", className)}
      role="img"
      aria-label="Lower body measurement guide"
    >
      {/* Waist band area */}
      <path
        d="M55,20 
           Q100,15 145,20
           L150,35
           Q100,40 50,35
           Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Left leg */}
      <path
        d="M50,35
           L45,80
           L42,140
           L40,200
           L42,260
           L45,300
           L75,300
           L78,260
           L80,200
           L82,140
           L85,80
           L100,50
           Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Right leg */}
      <path
        d="M100,50
           L115,80
           L118,140
           L120,200
           L122,260
           L125,300
           L155,300
           L158,260
           L160,200
           L158,140
           L155,80
           L150,35
           Z"
        className="fill-muted/30 stroke-muted-foreground/50 stroke-[1.5]"
      />
      
      {/* Waist region */}
      <ellipse 
        cx="100" cy="28" rx="48" ry="12"
        className={regionClass('waist')}
        onClick={() => onAreaClick?.('waist')}
      />
      <line x1="52" y1="28" x2="15" y2="28" className={lineClass('waist')} strokeDasharray="2,2" />
      <text x="5" y="31" className={labelClass('waist')}>Waist</text>
      
      {/* Hip region */}
      <ellipse 
        cx="100" cy="55" rx="52" ry="18"
        className={regionClass('hip')}
        onClick={() => onAreaClick?.('hip')}
      />
      <line x1="48" y1="55" x2="15" y2="55" className={lineClass('hip')} strokeDasharray="2,2" />
      <text x="5" y="58" className={labelClass('hip')}>Hip</text>
      
      {/* Crotch region */}
      <ellipse 
        cx="100" cy="85" rx="20" ry="15"
        className={regionClass('crotch')}
        onClick={() => onAreaClick?.('crotch')}
      />
      <line x1="120" y1="85" x2="175" y2="75" className={lineClass('crotch')} strokeDasharray="2,2" />
      <text x="177" y="78" className={labelClass('crotch')}>Crotch</text>
      
      {/* Thigh region - left */}
      <ellipse 
        cx="65" cy="110" rx="22" ry="12"
        className={regionClass('thigh')}
        onClick={() => onAreaClick?.('thigh')}
      />
      
      {/* Thigh region - right */}
      <ellipse 
        cx="135" cy="110" rx="22" ry="12"
        className={regionClass('thigh')}
        onClick={() => onAreaClick?.('thigh')}
      />
      <line x1="157" y1="110" x2="175" y2="105" className={lineClass('thigh')} strokeDasharray="2,2" />
      <text x="177" y="108" className={labelClass('thigh')}>Thigh</text>
      
      {/* Knee region - left */}
      <ellipse 
        cx="62" cy="180" rx="18" ry="10"
        className={regionClass('knee')}
        onClick={() => onAreaClick?.('knee')}
      />
      
      {/* Knee region - right */}
      <ellipse 
        cx="138" cy="180" rx="18" ry="10"
        className={regionClass('knee')}
        onClick={() => onAreaClick?.('knee')}
      />
      <line x1="156" y1="180" x2="175" y2="175" className={lineClass('knee')} strokeDasharray="2,2" />
      <text x="177" y="178" className={labelClass('knee')}>Knee</text>
      
      {/* Ankle region - left */}
      <ellipse 
        cx="60" cy="295" rx="14" ry="8"
        className={regionClass('ankle')}
        onClick={() => onAreaClick?.('ankle')}
      />
      
      {/* Ankle region - right */}
      <ellipse 
        cx="140" cy="295" rx="14" ry="8"
        className={regionClass('ankle')}
        onClick={() => onAreaClick?.('ankle')}
      />
      <line x1="154" y1="295" x2="175" y2="290" className={lineClass('ankle')} strokeDasharray="2,2" />
      <text x="177" y="293" className={labelClass('ankle')}>Hem</text>
      
      {/* Outseam line - left side */}
      <line 
        x1="25" y1="28" x2="25" y2="295" 
        className={cn(lineClass('outseam'), "stroke-[1.5]")}
        strokeDasharray="4,2"
        onClick={() => onAreaClick?.('outseam')}
        style={{ cursor: 'pointer' }}
      />
      <text x="12" y="160" className={labelClass('outseam')} transform="rotate(-90, 12, 160)">Outseam</text>
      
      {/* Inseam line */}
      <line 
        x1="100" y1="100" x2="60" y2="295" 
        className={cn(lineClass('inseam'), "stroke-[1.5]")}
        strokeDasharray="4,2"
        onClick={() => onAreaClick?.('inseam')}
        style={{ cursor: 'pointer' }}
      />
      <text x="85" y="200" className={labelClass('inseam')} transform="rotate(-70, 85, 200)">Inseam</text>
    </svg>
  );
}
