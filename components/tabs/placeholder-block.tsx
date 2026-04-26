import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { contentComingSoon } from "@/lib/data-placeholder";

type PlaceholderBlockProps = {
  title: string;
  subtitle: string;
};

export function PlaceholderBlock({ title, subtitle }: PlaceholderBlockProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          <span>{contentComingSoon}</span>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[70%]" />
      </CardContent>
    </Card>
  );
}
