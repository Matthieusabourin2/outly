import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, Screen, colors } from '@outly/ui';
import { useStaff } from '@/lib/staff';

export default function NoAccessScreen() {
  const { signOut } = useStaff();
  return (
    <Screen scroll={false}>
      <EmptyState
        icon={<Ionicons name="lock-closed-outline" size={44} color={colors.accent} />}
        title="No venue on this account"
        message="This account isn't linked to a venue yet. Ask your manager or the Outly team to add you."
        action={<Button label="Log out" variant="secondary" onPress={signOut} />}
      />
    </Screen>
  );
}
