import { cn } from "@/lib/utils";

interface Props {
  max: number;
  value: number;
  min: number;
  gaugePrimaryColor: string;
  gaugeSecondaryColor: string;
  className?: string;
}

export default function AnimatedCircularProgressBar({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  className,
}: Props) {
  const circumference = 2 * Math.PI * 45;
  const percentPx = circumference / 100;
  const currentPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative", className)}>
      <svg
        fill="none"
        className="w-full h-full animate-spin"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          className="opacity-25"
          stroke={gaugeSecondaryColor}
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          strokeDashoffset="0"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-75"
          stroke={gaugePrimaryColor}
          style={{
            strokeDasharray: `${currentPercent * percentPx} ${circumference}`,
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
      </svg>
    </div>
  );
}
