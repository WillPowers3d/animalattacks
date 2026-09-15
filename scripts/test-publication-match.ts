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
  {
    title: "I am confused by those Coca Cola cans that show Santa getting mauled by a polar bear",
    want: false,
  },
  { title: "Grizzly bear attacks mountain biker near Canmore, Alberta", want: true },
  { title: "Cougar attack reported outside Squamish, B.C.", want: true },
  { title: "Moose attacks skier on a Whitehorse trail", want: true },
  { title: "Parks Canada warns after elk gores visitor in Banff", want: true },
  { title: "Heritage Gallery celebrates banner season with quilting exhibition", snippet: "bear attack", want: false },
  { title: "Click Here to Learn More About Our Sponsored Content", snippet: "cougar attack", want: false },
  { title: "Bear spray used in attack downtown", snippet: "people being bear sprayed in Invermere", want: false },
  { title: "Apartments evacuated after bear spray attack, one arrested", want: false },
  { title: "Bear killed after attack seriously injures girl in Hay River", want: true },
  { title: "Bisons mauled by Cougars | the Manitoban", want: false },
  { title: "It wasn’t a bear that attacked a camper found dead in his tent", want: false },
  { title: "Elk hunter fends off cougar attack", want: true },
  { title: "Un ours attaque un randonneur près de Banff", want: true },
  { title: "Attaque d'ours mortelle près de Tulita", want: true },
  { title: "Un orignal attaque un skieur à Whitehorse", want: true },
  { title: "Un couguar attaque un chien à Squamish", want: true },
  { title: "Les Canadiens attaquent en troisième période", want: false },
  { title: "Balanced offensive attack propels Raiders past Cougars", want: false },
  { title: "Raiders hold off Cougar attack", want: false },
  {
    title: "How a bear attack story helped this author understand her cancer diagnosis | The Current | On Demand - CBC",
    want: false,
  },
  { title: "Jimmy Fallon mentioned bear attack of La Ronge, Sask., man during show | CBC News - CBC", want: false },
  { title: "Un oso negro atacó a un ganadero en Chihuahua", want: true },
  { title: "Puma agredió a un senderista cerca de Monterrey", want: true },
  { title: "León de montaña embistió a un ciclista en Sonora", want: true },
  { title: "Oso atacó a dos personas en Arteaga, Coahuila", want: true },
  { title: "Los Pumas vencen a América en el ataque final", want: false },
  { title: "Club Pumas vs Tigres: un ataque ofensivo", want: false },
  { title: "Maullido de gato asusta a vecinos en Tijuana", want: false },
  { title: 'Despedazan a hija de “El Puma” por sus fotos en bikini', want: false },
]

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
