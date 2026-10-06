import Ionicons from '@expo/vector-icons/Ionicons';
import { EmptyState, Screen, colors } from '@outly/ui';
import type { ComponentProps } from 'react';

type Props = { title: string; message: string; icon: ComponentProps<typeof Ionicons>['name'] };

/** Slice 0 tab placeholder. Each one is replaced by its real screen in a later slice. */
export function Placeholder({ title, message, icon }: Props) {
  return (
    <Screen scroll={false}>
      <EmptyState title={title} message={message} icon={<Ionicons name={icon} size={44} color={colors.accent} />} />
    </Screen>
  );
}
