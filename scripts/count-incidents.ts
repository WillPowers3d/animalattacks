import { prisma } from "../src/lib/prisma";

async function main() {
  const [total, weingarten, ca, caPub, local, bySource, byCountry] = await Promise.all([
    prisma.incident.count(),
    prisma.incident.count({ where: { sourceType: "ammoland" } }),
    prisma.incident.count({ where: { country: "CA" } }),
    prisma.incident.count({ where: { country: "CA", publicationId: { not: null } } }),
    prisma.incident.count({ where: { publicationId: { not: null } } }),
    prisma.incident.groupBy({ by: ["sourceType"], _count: { _all: true } }),
    prisma.incident.groupBy({ by: ["country"], _count: { _all: true } }),
  ]);
  console.log(JSON.stringify({ total, weingarten, ca, caPub, local, bySource, byCountry }, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
