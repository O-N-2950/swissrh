/* SwissRH Logo — couleurs officielles extraites du logo
   Rouge : #B32D26  |  Bleu : #366389  */

export function SwissRHLogo({ height = 36, dark = false }: { height?: number; dark?: boolean }) {
  const R = "#B32D26", B = "#366389";
  const sub = dark ? "rgba(255,255,255,.45)" : "#8fa3b1";

  return (
    <svg width={height * 3.6} height={height} viewBox="0 0 360 100"
      xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, display:"block" }}>
      {/* Écusson */}
      <path d="M14 8 L66 8 Q72 8 72 16 L72 58 Q72 82 40 96 Q8 82 8 58 L8 16 Q8 8 14 8 Z" fill={R}/>
      <path d="M14 8 L66 8 Q72 8 72 16 L72 40 Q60 20 40 22 Q20 20 8 40 L8 16 Q8 8 14 8 Z" fill="rgba(255,255,255,.12)"/>
      {/* Croix suisse */}
      <rect x="33" y="26" width="14" height="40" rx="2.5" fill="white"/>
      <rect x="20" y="38" width="40" height="14" rx="2.5" fill="white"/>
      {/* Silhouettes */}
      <circle cx="43" cy="10" r="6" fill={B}/>
      <path d="M34 22 Q43 14 52 22 L54 44 L43 40 L32 44 Z" fill={B}/>
      <circle cx="58" cy="5" r="6" fill={B}/>
      <path d="M49 17 Q58 9 67 17 L69 39 L58 35 L47 39 Z" fill={B}/>
      {/* Vague bleue */}
      <path d="M6 70 Q20 58 38 66 Q52 72 66 60 Q78 50 90 56" stroke={B} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M4 80 Q20 68 40 76 Q56 84 72 70 Q84 60 94 66" stroke={B} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5"/>
      {/* SWISS */}
      <text x="108" y="66" fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={R} letterSpacing="-1.5">SWISS</text>
      {/* RH */}
      <text x="289" y="66" fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={B} letterSpacing="-1">RH</text>
      {/* .CH */}
      <text x="340" y="66" fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={sub} letterSpacing="-1">.CH</text>
      {/* Sous-titre */}
      <text x="108" y="84" fontFamily="'Arial',sans-serif"
        fontWeight="400" fontSize="10.5" fill={sub} letterSpacing="2.2">
        RESSOURCES HUMAINES &amp; SOLUTIONS SUISSES
      </text>
    </svg>
  );
}

export function SwissRHIcon({ size = 32 }: { size?: number }) {
  const R = "#B32D26", B = "#366389";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, display:"block" }}>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 50 Q76 70 40 78 Q4 70 4 50 L4 16 Q4 8 10 8 Z" fill={R}/>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 35 Q62 18 40 20 Q18 18 4 35 L4 16 Q4 8 10 8 Z" fill="rgba(255,255,255,.13)"/>
      <rect x="32" y="22" width="16" height="38" rx="3" fill="white"/>
      <rect x="21" y="33" width="38" height="16" rx="3" fill="white"/>
      <circle cx="42" cy="8" r="6" fill={B}/>
      <path d="M33 18 Q42 11 51 18 L53 36 L42 33 L31 36 Z" fill={B}/>
      <circle cx="58" cy="3" r="5.5" fill={B}/>
      <path d="M50 13 Q58 7 66 13 L68 30 L58 27 L48 30 Z" fill={B}/>
    </svg>
  );
}
