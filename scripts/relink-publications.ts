import { relinkIncidentsToPublications } from "../src/lib/publications/progress";
import { prisma } from "../src/lib/prisma";

relinkIncidentsToPublications()
  .then(async (n) => {
    const local = await prisma.incident.count({ where: { publicationId: { not: null } } });
    const caPub = await prisma.incident.count({
      where: { country: "CA", publicationId: { not: null } },
    });
    console.log(JSON.stringify({ relinked: n, local, caPub }));
    await prisma.$disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
