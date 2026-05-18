import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
      {...props}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" />
    </svg>
  );
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  );
}

export function BedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <path d="M3 14h18M3 18v2M21 18v2" />
      <circle cx={7.5} cy={11.5} r={1.5} />
    </svg>
  );
}

export function BathIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
      <path d="M6 12V6a2 2 0 0 1 4 0" />
      <path d="M9 6h2" />
      <path d="M6 19v2M18 19v2" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx={9} cy={8} r={3.5} />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx={17} cy={9} r={2.5} />
      <path d="M16 20a5 5 0 0 1 5-5" />
    </svg>
  );
}

export function WifiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M2 9a16 16 0 0 1 20 0" />
      <path d="M5 13a11 11 0 0 1 14 0" />
      <path d="M8.5 16.5a6 6 0 0 1 7 0" />
      <circle cx={12} cy={20} r={1} fill="currentColor" />
    </svg>
  );
}

export function PhoneOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M10.7 13.3a14 14 0 0 0 4 4l1.3-1.3a2 2 0 0 1 2.1-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 18.25V21a1 1 0 0 1-1 1A18 18 0 0 1 3 4a1 1 0 0 1 1-1h2.75a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.81a2 2 0 0 1-.45 2.11L7.7 11" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
