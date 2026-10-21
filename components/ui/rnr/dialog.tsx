import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { GlassPanel } from './glass-panel';
import { Text } from './text';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogContent({ className, children, ...props }: DialogPrimitive.ContentProps & { className?: string }) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="absolute inset-0 items-center justify-center bg-black/60 p-4">
        <DialogPrimitive.Content {...props}>
          <GlassPanel strong className={cn('w-full max-w-lg gap-4 p-6', className)}>{children}</GlassPanel>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPortal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('gap-1.5', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('flex-row justify-end gap-2', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: DialogPrimitive.TitleProps & { className?: string }) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold text-foreground', className)} {...props} />;
}
export function DialogDescription({ className, ...props }: DialogPrimitive.DescriptionProps & { className?: string }) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
export { Text as DialogText };
