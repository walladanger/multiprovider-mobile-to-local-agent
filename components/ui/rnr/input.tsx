import * as React from 'react';
import { TextInput } from 'react-native';

import { tokens } from '@/theme/tokens';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.ComponentProps<typeof TextInput> & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor={tokens.palette.textMuted}
      className={cn('h-11 rounded-md border border-input bg-card/40 px-3 text-base text-foreground', props.editable === false && 'opacity-50', className)}
      {...props}
    />
  );
}
