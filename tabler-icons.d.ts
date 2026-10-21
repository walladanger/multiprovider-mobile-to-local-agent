// Per-icon deep imports from @tabler/icons-react-native ship without typings for the subpath.
declare module '@tabler/icons-react-native/*' {
  import type { ComponentType } from 'react';
  const Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  export default Icon;
}
