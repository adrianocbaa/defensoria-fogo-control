import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceholderModuleProps {
  title: string;
  description?: string;
}

export function PlaceholderModule({ title, description }: PlaceholderModuleProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <Badge variant="secondary">Em desenvolvimento</Badge>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
