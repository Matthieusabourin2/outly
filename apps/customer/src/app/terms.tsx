import { LegalPage } from '@/components/LegalPage';
import { TERMS } from '@/content/legal';

export default function TermsScreen() {
  return <LegalPage title="Terms of Use" sections={TERMS} />;
}
