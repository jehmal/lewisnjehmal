import React from 'react';
import ShimmerButton from "@/components/magicui/shimmer-button";
import { Loader2 } from 'lucide-react';
import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";

interface ContinueButtonProps {
  onClick: () => void;
  isLoading: boolean;
  progress?: number;
  text?: string;
}

export const ContinueButton: React.FC<ContinueButtonProps> = ({ 
  onClick, 
  isLoading, 
  progress = 0,
  text = 'Continue Generating'
}) => (
  <div className="flex items-center gap-2">
    <ShimmerButton
      onClick={onClick}
      disabled={isLoading}
      shimmerColor="#eca72c"
      background="#ee5622"
      className="flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Continuing...
        </>
      ) : (
        text
      )}
    </ShimmerButton>
    {isLoading && (
      <div className="relative w-8 h-8">
        <AnimatedCircularProgressBar
          max={100}
          min={0}
          value={progress}
          gaugePrimaryColor="#ee5622"
          gaugeSecondaryColor="rgba(238, 86, 34, 0.2)"
        />
        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
          {progress}%
        </span>
      </div>
    )}
  </div>
); 