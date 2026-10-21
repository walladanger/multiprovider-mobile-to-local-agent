import * as Slot from '@rn-primitives/slot';
import * as React from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

export const TextClassContext = React.createContext<string | undefined>(undefined);

export function Text({ className, asChild = false, ...props }: React.ComponentProps<typeof RNText> & { asChild?: boolean; className?: string }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return <Component className={cn('text-base text-foreground', textClass, className)} {...props} />;
}
