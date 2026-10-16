// CLI entry for the price refresh job: `npm run prices:refresh`
import { runPriceRefresh } from "../src/lib/pricing/refresh";
import { prisma } from "../src/lib/db";

runPriceRefresh()
  .then((report) => console.log(JSON.stringify(report, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
