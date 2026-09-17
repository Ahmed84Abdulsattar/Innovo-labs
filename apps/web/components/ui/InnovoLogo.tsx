interface LogoProps {
  variant?: 'white' | 'aqua' | 'dark' | 'slate'
  /** Explicit fill (e.g. a CSS variable) — overrides `variant` when set. */
  color?: string
  className?: string
  height?: number
}

const COLOR_MAP = {
  white: '#ffffff',
  aqua:  '#9ef3ee',
  dark:  '#122023',
  slate: '#122023',
}

// Original innovo wordmark paths — viewBox origin: x=90, y=363, spans ~1750w × 380h
const LOGO_PATH = "M1048.63,658.77c55.6,0,101.5-45.45,101.5-101.05s-45.89-101.94-101.5-101.94c-55.6,0-101.05,46.33-101.05,101.94S993.02,658.77,1048.63,658.77 M1048.63,398.41c88.26,0,158.86,71.05,158.86,159.3s-70.61,158.42-158.86,158.42c-88.26,0-158.42-70.16-158.42-158.42S960.37,398.41,1048.63,398.41 M1214.19,414.35c-2.64-5.72,0.88-11.44,7.48-11.44h45.1c3.95,0,6.59,2.64,7.47,4.83l84.33,188.86h3.08l84.33-188.86c0.88-2.2,3.51-4.83,7.47-4.83h45.1c6.6,0,10.12,5.72,7.48,11.44l-136.45,296.22c-1.32,2.64-3.52,4.84-7.48,4.84h-4.4c-3.96,0-6.16-2.2-7.48-4.84L1214.19,414.35z M1671.14,658.77c55.6,0,101.5-45.45,101.5-101.05s-45.89-101.94-101.5-101.94c-55.6,0-101.06,46.33-101.06,101.94S1615.53,658.77,1671.14,658.77 M1671.14,398.41c88.26,0,158.86,71.05,158.86,159.3s-70.61,158.42-158.86,158.42c-88.26,0-158.42-70.16-158.42-158.42S1582.88,398.41,1671.14,398.41 M453.65,713.79c-4.58,0-8.3-3.72-8.3-8.3V538.14c0-50.49-31.43-83.12-80.08-83.12c-48.25,0-79.43,32.63-79.43,83.12v167.34c0,4.58-3.72,8.3-8.3,8.3h-41.99c-4.58,0-8.3-3.72-8.3-8.3V538.14c0-89.14,49.13-138.23,138.35-138.23S503.94,449,503.94,538.14v167.34c0,4.59-3.72,8.3-8.3,8.3H453.65z M790.57,713.79c-4.58,0-8.3-3.72-8.3-8.3V538.14c0-50.49-31.43-83.12-80.08-83.12c-48.25,0-79.43,32.63-79.43,83.12v167.34c0,4.58-3.72,8.3-8.3,8.3H574.1c-4.58,0-8.3-3.72-8.3-8.3V538.14c0-89.14,49.13-138.23,138.35-138.23c89.22,0,138.35,49.09,138.35,138.23v167.34c0,4.58-3.72,8.3-8.3,8.3H790.57z M128.96,441.79c21.52,0,38.96-17.45,38.96-38.97c0-21.52-17.44-38.96-38.96-38.96S90,381.3,90,402.82C90,424.34,107.45,441.79,128.96,441.79 M108.68,474.52h41.82c4.61,0,8.39,3.77,8.39,8.39V705.4c0,4.61-3.77,8.39-8.39,8.39h-41.82c-4.61,0-8.39-3.78-8.39-8.39V482.91C100.29,478.3,104.06,474.52,108.68,474.52z"

export default function InnovoLogo({ variant = 'dark', color: colorProp, className = '', height = 28 }: LogoProps) {
  const color = colorProp ?? COLOR_MAP[variant]
  const width  = height * 6.8

  return (
    <svg
      viewBox="90 355 2480 395"
      height={height}
      width={width}
      className={className}
      aria-label="Innovo Labs"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* innovo vector wordmark */}
      <path fill={color} d={LOGO_PATH} />

      {/*
        "Labs" — uses Poppins 800 loaded via next/font in layout.tsx.
        The font-family references the CSS variable so it's guaranteed to
        be the same Poppins instance already loaded for the whole app.
        fontSize 305 + letterSpacing -6 matches the cap-height and stroke
        weight of the innovo wordmark at this viewBox scale.
      */}
      <text
        x={1900}
        y={716}
        fontFamily="var(--font-poppins), 'Poppins', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="600"
        fontSize="305"
        fill={color}
        letterSpacing="-6"
      >
        Labs
      </text>
    </svg>
  )
}
