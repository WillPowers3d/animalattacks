import { matchAnimalAttack } from "../src/lib/publications/match";

const cases: { title: string; snippet?: string; want: boolean }[] = [
  { title: "Grizzly bear attacks hiker near West Yellowstone", want: true },
  { title: "Mountain lion mauls dog in Boulder backyard", want: true },
  { title: "Cougar attack reported outside Missoula", want: true },
  { title: "Puma charged a trail runner in New Mexico", want: true },
  { title: "Moose attacks skier in Anchorage neighborhood", want: true },
  { title: "Elk gores visitor at Estes Park", want: true },
  { title: "Bear market slumps as charging station stocks rise", want: false },
  { title: "Chicago Bears attack the Packers' secondary", want: false },
  { title: "Puma sneakers on sale this weekend", want: false },
  { title: "City council meeting in Elk Grove", snippet: "budget hearing", want: false },
  { title: "New coffee shop opens on Bear Creek Road", want: false },
  { title: "Police say man was mauled by a black bear", want: true },
  { title: "Lodgepole man charged with poaching deer and elk", want: false },
  { title: "Hunter charged with illegal mountain lion kill", want: false },
  { title: "Grizzly charged a hunter near Choteau", want: true },
  { title: "Boulder policemen charged in elk shooting", want: false },
  { title: "Cocaine Bear thrives with outstanding gore", want: false },
  { title: "Bear attacks in Colorado are climate attacks", want: false },
];

let failed = 0;
for (const c of cases) {
  const got = matchAnimalAttack(c.title, c.snippet);
  if (got.matched !== c.want) {
    failed += 1;
    console.error(`FAIL "${c.title}" want=${c.want} got=${got.matched} ${got.reason ?? ""}`);
  } else {
    console.log(`ok  "${c.title}" -> ${got.matched ? got.species : "skip"}`);
  }
}
if (failed) {
  console.error(`${failed} matcher tests failed`);
  process.exit(1);
}
console.log(`All ${cases.length} matcher tests passed.`);
