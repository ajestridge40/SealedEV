import { Badge } from "@/components/ui/badge";
import { RATING_LABEL, type ConfidenceLevel, type Freshness, type OddsSource, type ValueRating } from "@/lib/ev";
import { gameChip } from "@/lib/games";
import { cn } from "@/lib/utils";

export function RatingBadge({ rating, className }: { rating: ValueRating; className?: string }) {
  const variant = rating === "GOOD" ? "good" : rating === "FAIR" ? "fair" : rating === "OVERPRICED" ? "bad" : "secondary";
  return (
    <Badge variant={variant} className={className}>
      {RATING_LABEL[rating]}
    </Badge>
  );
}

const CONF_LABEL: Record<ConfidenceLevel, string> = { HIGH: "High confidence", MEDIUM: "Medium confidence", LOW: "Low confidence" };

export function ConfidenceBadge({ level, title }: { level: ConfidenceLevel; title?: string }) {
  return (
    <Badge variant="outline" title={title} className="gap-1.5">
      <span className={cn("size-1.5 rounded-full", level === "HIGH" ? "bg-good" : level === "MEDIUM" ? "bg-fair" : "bg-bad")} />
      {CONF_LABEL[level]}
    </Badge>
  );
}

const FRESH_LABEL: Record<Freshness, string> = { FRESH: "Fresh", AGING: "Aging", STALE: "Stale", NONE: "No price" };

export function FreshnessBadge({ value, title }: { value: Freshness; title?: string }) {
  return (
    <Badge variant={value === "FRESH" ? "good" : value === "AGING" ? "fair" : "secondary"} title={title}>
      {FRESH_LABEL[value]}
    </Badge>
  );
}

const ODDS_LABEL: Record<OddsSource, string> = { PUBLISHED: "Published odds", COMMUNITY: "Community estimate", ESTIMATE: "Rough estimate" };

export function OddsSourceBadge({ source }: { source: OddsSource }) {
  return <Badge variant={source === "PUBLISHED" ? "good" : source === "COMMUNITY" ? "fair" : "secondary"}>{ODDS_LABEL[source]}</Badge>;
}

export function GameChip({ slug, name }: { slug: string; name: string }) {
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", gameChip(slug))}>{name}</span>;
}
