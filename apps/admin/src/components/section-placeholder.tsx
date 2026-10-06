import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { NavItem } from '@/lib/nav';

export function SectionPlaceholder({ item }: { item: NavItem }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <item.icon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
        <Badge variant="secondary">Slice {item.slice}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
