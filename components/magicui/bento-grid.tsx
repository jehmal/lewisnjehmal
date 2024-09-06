import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import BoxReveal from "@/components/magicui/box-reveal";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("grid", className)}>
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      "bg-white border border-gray-200",
      "dark:bg-raisin-black dark:border-dark-purple",
      className,
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <Icon className="h-12 w-12 origin-left transform-gpu text-hunyadi-yellow transition-all duration-300 ease-in-out group-hover:scale-75" />
      <BoxReveal boxColor="#eca72c" duration={0.5}>
        <h3 className="text-xl font-semibold text-english-violet dark:text-hunyadi-yellow">
          {name}
        </h3>
      </BoxReveal>
      <p className="max-w-lg text-dark-purple dark:text-gray-300">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto">
        <a href={href} className="text-flame hover:text-hunyadi-yellow">
          {cta}
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-english-violet/10 dark:group-hover:bg-dark-purple/20" />
  </div>
);

export { BentoCard, BentoGrid };
