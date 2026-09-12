import { exportCrawlProgress } from "../src/lib/publications/progress";
import { prisma } from "../src/lib/prisma";

exportCrawlProgress()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
