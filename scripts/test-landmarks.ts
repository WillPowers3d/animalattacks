import { inferLandmarkPlace } from "../src/lib/publications/landmarks";
import { articleToIncident } from "../src/lib/publications/to-incident";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL ${msg}`);
  } else {
    console.log(`ok  ${msg}`);
  }
}

function main() {
  const glacier = inferLandmarkPlace(
    "Deadly bear attack in Glacier National Park is the first in decades at the iconic park",
  );
  assert(glacier?.stateProvince === "MT" && glacier.country === "US", "Glacier NP → MT");

  const yellowstone = inferLandmarkPlace("Grizzly injures hiker in Yellowstone National Park");
  assert(yellowstone?.stateProvince === "WY", "Yellowstone → WY");

  const banff = inferLandmarkPlace("Visitor charged by elk near Banff National Park");
  assert(banff?.stateProvince === "AB" && banff.country === "CA", "Banff → AB");

  assert(inferLandmarkPlace("City council debates bear-proof bins") === null, "no landmark → null");

  const steamboat = inferLandmarkPlace("Steamboat Springs bear encounter marks 8th attack this year");
  assert(steamboat?.city === "Steamboat Springs" && steamboat.stateProvince === "CO", "Steamboat Springs → CO");

  const reprint = articleToIncident(
    {
      url: "https://www.akronnewsreporter.com/2026/05/08/glacier-national-park-bear-attack-hiker-dead/",
      title: "Deadly bear attack in Glacier National Park is the first in decades at the iconic park",
      snippet: "A hiker was killed in Glacier National Park.",
      isoDate: "2026-05-08",
      source: "rss",
    },
    {
      id: "pub-akron",
      name: "akronnewsreporter.com",
      city: "Akron",
      state: "CO",
      country: "US",
      lat: 40.16,
      lng: -103.21,
    },
  );
  assert(reprint?.stateProvince === "MT", "CO paper reprint does not pin Glacier to Colorado");
  assert(reprint?.city === "Glacier", "landmark city wins over paper town");
  assert(reprint?.country === "US", "Glacier reprint stays US");

  if (failed) {
    console.error(`${failed} landmark test(s) failed`);
    process.exit(1);
  }
  console.log("landmark tests passed");
}

void main();
