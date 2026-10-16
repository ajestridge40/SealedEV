import { DEFAULT_LIQUIDATION, ODDS_WEIGHT, RATING_THRESHOLDS } from "@/lib/ev";
import { money, plainPct } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "How EV works" };

function Formula({ children }: { children: React.ReactNode }) {
  return <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs sm:text-sm">{children}</pre>;
}

export default function MethodologyPage() {
  const d = DEFAULT_LIQUIDATION;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">How EV is calculated</h1>
        <p className="text-sm text-muted-foreground">
          Everything here is implemented in <code>src/lib/ev/</code> as small, pure, unit-tested functions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Pull tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Each pack type (e.g. a Pokémon booster pack, a Magic Play Booster) is split into <strong>tiers</strong>: groups of cards that share a
            pull rate, such as &quot;Special Illustration Rare&quot; or &quot;Mythic&quot;. A tier has:
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            <li><strong>perPack</strong>: expected copies per pack (1 in 87 packs → 0.0115; 4 commons → 4)</li>
            <li><strong>poolSize</strong>: number of distinct cards in the tier</li>
            <li><strong>listed cards</strong> with market prices (usually the chase cards)</li>
            <li><strong>unlisted card value</strong>: assumed value for every other card in the pool</li>
            <li><strong>odds source</strong>: Published, Community estimate or Rough estimate, with a link</li>
          </ul>
          <Formula>{`avgTierValue = ( Σ v(price of each priced card)
               + (poolSize − pricedCount) × v(unlistedCardValue) ) / poolSize

tierEV/pack  = perPack × avgTierValue`}</Formula>
          <p className="text-muted-foreground">Every card in a tier is assumed equally likely, the standard assumption for random inserts.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Product EV, difference and ROI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Formula>{`EV/pack     = Σ tiers tierEV/pack
Product EV  = Σ packTypes (packCount × EV/pack) + Σ extras (promos etc.)
EV − Price  = Product EV − market price
ROI         = (EV − Price) / Price`}</Formula>
          <p>
            Ratings: <strong className="text-good">Good Value</strong> ROI ≥ {RATING_THRESHOLDS.good * 100}%,{" "}
            <strong className="text-fair">Fair</strong> ROI ≥ {RATING_THRESHOLDS.fair * 100}%, otherwise{" "}
            <strong className="text-bad">Overpriced</strong>. Most sealed products trade above their opening EV, because sealed product
            carries a collector premium. A product that rates Good is unusual and worth a closer look.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Raw vs. net EV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Raw EV uses market prices as-is. Net EV estimates the cash you&apos;d actually get after opening and selling:</p>
          <Formula>{`v(price) = price                                   (raw)
v(price) = min(price, bulkValue)                    if price < sellThreshold
         = max(bulk, price × (1 − fees) − perCardCost)  otherwise`}</Formula>
          <p className="text-muted-foreground">
            Defaults: fees {plainPct(d.feePct, 0)}, {money(d.perCardCost)} per single sold, singles under {money(d.sellThreshold)} bulked at{" "}
            {money(d.bulkValue)}. Change them in Settings. Grading isn&apos;t modelled: grade outcomes are too uncertain to put in an EV
            without inventing numbers.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Break-even & hit probability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Formula>{`P(≥1 from tier in product) = 1 − (1 − perPack)^packs
chasesNeeded = max(0, price − nonChaseEV) / avgChaseValue
P(break even) ≈ Poisson(λ = expected chases).P(N ≥ ⌈chasesNeeded⌉)`}</Formula>
          <p className="text-muted-foreground">
            These assume packs are independent. Real boxes are often collated (for example, a guaranteed number of hits per box), so treat
            them as approximations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Confidence & freshness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Formula>{`confidence = 0.4 × oddsQuality + 0.3 × priceCoverage + 0.3 × freshness
oddsQuality: EV-weighted; Published ${ODDS_WEIGHT.PUBLISHED}, Community ${ODDS_WEIGHT.COMMUNITY}, Estimate ${ODDS_WEIGHT.ESTIMATE}
coverage:    share of tier value backed by real card prices (assumptions count half)
freshness:   ≤36h fresh · ≤10d aging · older (or seed estimates) stale`}</Formula>
          <p className="text-muted-foreground">
            High ≥ 80%, Medium ≥ 60%, otherwise Low. SealedEV never labels odds as published unless they link to the manufacturer&apos;s own
            source. Most publishers (The Pokémon Company, Ravensburger, Bandai) don&apos;t publish odds, so their sets rely on community
            estimates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
