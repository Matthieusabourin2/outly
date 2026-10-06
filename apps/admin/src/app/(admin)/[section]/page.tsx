import { notFound } from 'next/navigation';
import { SectionPlaceholder } from '@/components/section-placeholder';
import { NAV } from '@/lib/nav';

export function generateStaticParams() {
  return NAV.filter((item) => item.slug).map((item) => ({ section: item.slug }));
}

export const dynamicParams = false;

export default async function SectionPage(props: PageProps<'/[section]'>) {
  const { section } = await props.params;
  const item = NAV.find((n) => n.slug === section);
  if (!item) notFound();
  return <SectionPlaceholder item={item} />;
}
