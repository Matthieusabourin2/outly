import { LegalPage } from '@/components/LegalPage';
import { PRIVACY } from '@/content/legal';

export default function PrivacyScreen() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY} />;
}
