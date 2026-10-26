import * as React from 'react';
import { View, type ViewProps } from 'react-native';

import { GlassPanel } from './glass-panel';
import { cn } from '@/lib/utils';
import { Text, TextClassContext } from './text';

type P = ViewProps & { className?: string };

export function Card({ className, children, ...props }: P) {
  return (
    <GlassPanel className={cn('rounded-xl', className)} {...props}>
      <TextClassContext.Provider value="text-card-foreground">{children}</TextClassContext.Provider>
    </GlassPanel>
  );
}
export function CardHeader({ className, ...props }: P) {
  return <View className={cn('gap-1.5 p-5', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text role="heading" className={cn('text-lg font-semibold', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
export function CardContent({ className, ...props }: P) {
  return <View className={cn('px-5 pb-5', className)} {...props} />;
}
export function CardFooter({ className, ...props }: P) {
  return <View className={cn('flex-row items-center px-5 pb-5', className)} {...props} />;
}
