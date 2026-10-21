import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable } from 'react-native';

import { cn } from '@/lib/utils';
import { TextClassContext } from './text';

const buttonVariants = cva('flex-row items-center justify-center rounded-md active:opacity-90', {
  variants: {
    variant: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-card/40',
      secondary: 'bg-secondary',
      ghost: 'active:bg-accent/20',
      link: '',
    },
    size: { default: 'h-11 px-5 py-2', sm: 'h-9 px-3', lg: 'h-12 px-8', icon: 'h-10 w-10' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('text-sm font-semibold text-foreground', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: '',
      secondary: 'text-secondary-foreground',
      ghost: '',
      link: 'text-primary underline',
    },
    size: { default: '', sm: '', lg: 'text-base', icon: '' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants> & { className?: string };

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        role="button"
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { buttonTextVariants, buttonVariants };
