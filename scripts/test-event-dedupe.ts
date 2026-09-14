import { reprintPathKey, sameEvent } from "../src/lib/publications/event-dedupe";
import { sourceBadge } from "../src/lib/source-badge";

type Case = {
  name: string;
  a: Parameters<typeof sameEvent>[0];
  b: Parameters<typeof sameEvent>[0];
  want: boolean;
};

const cases: Case[] = [
  {
    name: "Bella Coola school-group reprints",
    a: {
      title: "UPDATE: Three school children, 1 adult injured in Bella Coola grizzly bear attack",
      species: "bear",
      country: "CA",
      city: "Bella Coola",
      stateProvince: "BC",
    },
    b: {
      title: "Grizzly bear attacks Nuxalk Nation students, teachers in B.C.",
      species: "bear",
      country: "CA",
      city: "Winnipeg",
      stateProvince: "MB",
    },
    want: true,
  },
  {
    name: "Bella Coola follow-up vs elementary class wire",
    a: {
      title: "Pupils flee as grizzly attacks elementary class in B.C., injuring 11, some critically",
      species: "bear",
      country: "CA",
      stateProvince: "MB",
    },
    b: {
      title: "Search continues for grizzly that attacked students, teachers at B.C. trail",
      species: "bear",
      country: "CA",
      stateProvince: "BC",
    },
    want: true,
  },
  {
    name: "Hay River girl reprints",
    a: {
      title: "Bear killed after attack seriously injures girl in Hay River",
      species: "bear",
      country: "CA",
      city: "Hay River",
      stateProvince: "NT",
    },
    b: {
      title: "Hay River couple fought off bear attacking girl with boots, statue of angel",
      species: "bear",
      country: "CA",
      city: "Hay River",
      stateProvince: "NT",
    },
    want: true,
  },
  {
    name: "same path different Black Press hosts",
    a: {
      title: "Ladysmith man saves dog from cougar attack",
      species: "mountain_lion",
      country: "CA",
      urls: ["https://www.albernivalleynews.com/2018/09/10/ladysmith-man-saves-dog-from-cougar-attack-on-holland-creek-trail/"],
    },
    b: {
      title: "Ladysmith man saves dog from cougar attack on Holland Creek trail",
      species: "mountain_lion",
      country: "CA",
      urls: ["https://www.cowichanvalleycitizen.com/2018/09/10/ladysmith-man-saves-dog-from-cougar-attack-on-holland-creek-trail/"],
    },
    want: true,
  },
  {
    name: "do not merge Mayo fatal with Yukon dog-survivor",
    a: {
      title: "UPDATED: Woman, 10-month-old child dead after bear attack northeast of Mayo",
      species: "bear",
      country: "CA",
      city: "Mayo",
      stateProvince: "YT",
    },
    b: {
      title: "Yukon bear attack survivor believes her dog — and a hair clip — saved her life",
      species: "bear",
      country: "CA",
      city: "Whitehorse",
      stateProvince: "YT",
    },
    want: false,
  },
  {
    name: "do not merge Tulita musician with Hay River girl",
    a: {
      title: "Coroner confirms bear attack killed musician near Tulita",
      species: "bear",
      country: "CA",
      city: "Tulita",
      stateProvince: "NT",
    },
    b: {
      title: "Bear killed after attack seriously injures girl in Hay River",
      species: "bear",
      country: "CA",
      city: "Hay River",
      stateProvince: "NT",
    },
    want: false,
  },
  {
    name: "do not merge different species",
    a: { title: "Cougar attack reported outside Squamish, B.C.", species: "mountain_lion", country: "CA" },
    b: { title: "Bear attack reported outside Squamish, B.C.", species: "bear", country: "CA" },
    want: false,
  },
  {
    name: "same-day near-identical titles",
    a: {
      title: "Local woman recovering from bear attack",
      occurredAt: "2024-06-02",
      city: "Fort Frances",
      stateProvince: "ON",
      species: "bear",
      country: "CA",
    },
    b: {
      title: "Woman recovering from bear attack",
      occurredAt: "2024-06-02",
      city: "Fort Frances",
      stateProvince: "ON",
      species: "bear",
      country: "CA",
    },
    want: true,
  },
];

let failed = 0;
for (const c of cases) {
  const got = sameEvent(c.a, c.b);
  if (got.match !== c.want) {
    failed += 1;
    console.error(`FAIL ${c.name} want=${c.want} got=${got.match} ${got.reason} score=${got.score.toFixed(2)}`);
  } else {
    console.log(`ok  ${c.name} -> ${got.match ? got.reason : "skip"} (${got.score.toFixed(2)})`);
  }
}

const pathA = reprintPathKey(
  "https://www.albernivalleynews.com/2018/09/10/ladysmith-man-saves-dog-from-cougar-attack-on-holland-creek-trail/",
);
const pathB = reprintPathKey(
  "https://www.cowichanvalleycitizen.com/2018/09/10/ladysmith-man-saves-dog-from-cougar-attack-on-holland-creek-trail/",
);
if (pathA !== pathB || !pathA) {
  failed += 1;
  console.error("FAIL reprint path keys should match");
} else {
  console.log("ok  reprint path keys match");
}

const badges = [
  sourceBadge({ sourceType: "ammoland" }).label === "Weingarten",
  sourceBadge({ sourceType: "news", publicationId: "pub1" }).label === "Local paper",
  sourceBadge({ sourceType: "news" }).label === "Google News",
  sourceBadge({ sourceType: "agency" }).label === "Agency",
];
if (badges.some((ok) => !ok)) {
  failed += 1;
  console.error("FAIL source badges", badges);
} else {
  console.log("ok  source badges");
}

if (failed) {
  console.error(`${failed} event-dedupe tests failed`);
  process.exit(1);
}
console.log(`All ${cases.length + 2} event-dedupe checks passed.`);
