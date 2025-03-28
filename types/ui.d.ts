declare module '@/components/ui/alert' {
  import { FC, HTMLAttributes } from 'react';
  import { VariantProps } from 'class-variance-authority';

  export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'destructive';
  }

  export const Alert: FC<AlertProps>;
  export const AlertTitle: FC<HTMLAttributes<HTMLHeadingElement>>;
  export const AlertDescription: FC<HTMLAttributes<HTMLParagraphElement>>;
}

declare module '@/components/ui/card' {
  import { FC, HTMLAttributes } from 'react';

  export const Card: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>>;
  export const CardDescription: FC<HTMLAttributes<HTMLParagraphElement>>;
  export const CardContent: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardFooter: FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/badge' {
  import { FC, HTMLAttributes } from 'react';
  import { VariantProps } from 'class-variance-authority';

  export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }

  export const Badge: FC<BadgeProps>;
  export const badgeVariants: (props?: BadgeProps) => string;
}

declare module '@/components/ui/skeleton' {
  import { FC, HTMLAttributes } from 'react';

  export const Skeleton: FC<HTMLAttributes<HTMLDivElement>>;
} 