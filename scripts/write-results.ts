import { writeResultsReport } from "../src/lib/publications/write-results";
import { prisma } from "../src/lib/prisma";

writeResultsReport()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
