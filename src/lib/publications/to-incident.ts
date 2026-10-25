import { geocodeIncident, offsetCoord } from "../geo";
import type { SeedIncident, Species } from "../types";
import { matchAnimalAttack } from "./match";
import { CA_PROVINCE_NAMES, MX_STATE_NAMES, US_STATE_NAMES } from "./states";
import type { ArticleCandidate } from "./types";

const STATE_RE: [RegExp, string][] = [
  [/\bAlaska\b|\bAK\b/, "AK"],
  [/\bMontana\b|\bMT\b/, "MT"],
  [/\bWyoming\b|\bWY\b/, "WY"],
  [/\bIdaho\b|\bID\b/, "ID"],
  [/\bColorado\b|\bCO\b/, "CO"],
  [/\bCalifornia\b|\bCA\b/, "CA"],
  [/\bWashington\b|\bWA\b/, "WA"],
  [/\bOregon\b|\bOR\b/, "OR"],
  [/\bArizona\b|\bAZ\b/, "AZ"],
  [/\bNew Mexico\b|\bNM\b/, "NM"],
  [/\bUtah\b|\bUT\b/, "UT"],
  [/\bNevada\b|\bNV\b/, "NV"],
  [/\bMaine\b|\bME\b/, "ME"],
  [/\bMinnesota\b|\bMN\b/, "MN"],
  [/\bWisconsin\b|\bWI\b/, "WI"],
  [/\bMichigan\b|\bMI\b/, "MI"],
  [/\bNew York\b|\bNY\b/, "NY"],
  [/\bNew Hampshire\b|\bNH\b/, "NH"],
  [/\bVermont\b|\bVT\b/, "VT"],
  [/\bPennsylvania\b|\bPA\b/, "PA"],
  [/\bTennessee\b|\bTN\b/, "TN"],
  [/\bNorth Carolina\b|\bNC\b/, "NC"],
  [/\bVirginia\b|\bVA\b/, "VA"],
  [/\bFlorida\b|\bFL\b/, "FL"],
  [/\bTexas\b|\bTX\b/, "TX"],
  [/\bOhio\b|\bOH\b/, "OH"],
  [/\bGeorgia\b|\bGA\b/, "GA"],
  [/\bIllinois\b|\bIL\b/, "IL"],
  [/\bMassachusetts\b|\bMA\b/, "MA"],
  [/\bOklahoma\b|\bOK\b/, "OK"],
  [/\bArkansas\b|\bAR\b/, "AR"],
  [/\bKentucky\b|\bKY\b/, "KY"],
  [/\bMissouri\b|\bMO\b/, "MO"],
  [/\bIowa\b|\bIA\b/, "IA"],
  [/\bKansas\b|\bKS\b/, "KS"],
  [/\bNebraska\b|\bNE\b/, "NE"],
  [/\bLouisiana\b|\bLA\b/, "LA"],
  [/\bAlabama\b|\bAL\b/, "AL"],
  [/\bSouth Carolina\b|\bSC\b/, "SC"],
  [/\bMississippi\b|\bMS\b/, "MS"],
  [/\bIndiana\b|\bIN\b/, "IN"],
  [/\bWest Virginia\b|\bWV\b/, "WV"],
  [/\bSouth Dakota\b|\bSD\b/, "SD"],
  [/\bNorth Dakota\b|\bND\b/, "ND"],
  [/\bNew Jersey\b|\bNJ\b/, "NJ"],
  [/\bMaryland\b|\bMD\b/, "MD"],
  [/\bConnecticut\b|\bCT\b/, "CT"],
  [/\bHawaii\b|\bHI\b/, "HI"],
];

const PROVINCE_RE: [RegExp, string][] = [
  [/\bBritish Columbia\b|\bB\.C\.\b|\bColombie[- ]Britannique\b|\bC\.-B\.\b/, "BC"],
  [/\bAlberta\b|\bAlta\.\b/, "AB"],
  [/\bSaskatchewan\b|\bSask\.\b/, "SK"],
  [/\bManitoba\b/, "MB"],
  [/\bOntario\b/, "ON"],
  [/\bYukon\b/, "YT"],
  [/\bNorthwest Territories\b|\bN\.W\.T\.\b|\bNWT\b|\bTerritoires du Nord[- ]Ouest\b/, "NT"],
  [/\bNunavut\b/, "NU"],
  [/\bQuebec\b|\bQuébec\b/, "QC"],
  [/\bNew Brunswick\b|\bNouveau[- ]Brunswick\b/, "NB"],
  [/\bNova Scotia\b|\bNouvelle[- ]Écosse\b/, "NS"],
  [/\bNewfoundland\b|\bLabrador\b|\bTerre[- ]Neuve\b/, "NL"],
];

const MX_STATE_RE: [RegExp, string][] = [
  [/\bSonora\b/, "SON"],
  [/\bChihuahua\b/, "CHH"],
  [/\bCoahuila\b/, "COA"],
  [/\bNuevo Le[oó]n\b/, "NLE"],
  [/\bBaja California Sur\b/, "BCS"],
  [/\bBaja California\b/, "BCN"],
  [/\bSinaloa\b/, "SIN"],
  [/\bDurango\b/, "DUR"],
  [/\bTamaulipas\b/, "TAM"],
  [/\bJalisco\b/, "JAL"],
  [/\bMichoac[aá]n\b/, "MIC"],
  [/\bNayarit\b/, "NAY"],
  [/\bGuerrero\b/, "GRO"],
  [/\bOaxaca\b/, "OAX"],
  [/\bChiapas\b/, "CHP"],
  [/\bCampeche\b/, "CAM"],
  [/\bQuintana Roo\b/, "ROO"],
  [/\bYucat[aá]n\b/, "YUC"],
  [/\bZacatecas\b/, "ZAC"],
  [/\bSan Luis Potos[ií]\b/, "SLP"],
  [/\bCiudad de M[eé]xico\b|\bCDMX\b/, "CMX"],
];

function inferSeverity(text: string): SeedIncident["severity"] {
  if (
    /\b(killed|dead|dies|fatal|fatally|died|tu[ée]e?s?|mortel(?:le)?|muert[oa]s?|fallec(?:ió|ido)|mat[oó]|mortal)\b/i.test(
      text,
    )
  )
    return "fatal";
  if (
    /\b(injur|maul|gored|trampled|hospital|bitten|wound|clawed|bless[ée]e?s?|hospitalis[ée]e?s?|herid[oa]s?|lesionad[oa]s?|hospitaliz)\b/i.test(
      text,
    )
  )
    return "injury";
  if (/\b(home|cabin|property|break-in|livestock|pet|bétail|propriété|ganado|vivienda)\b/i.test(text))
    return "property";
  return "near_miss";
}

function inferSubspecies(species: Species, text: string): string | null {
  if (species === "bear") {
    if (/grizzly|grizzli|brown bear/i.test(text)) return "grizzly";
    if (/black bear|ours noir|oso negro/i.test(text)) return "black";
    if (/polar|ours polaire/i.test(text)) return "polar";
  }
  if (species === "mountain_lion") return "cougar";
  return null;
}

export type PublicationLocation = {
  id: string;
  name: string;
  town?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  circulationTier?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function articleToIncident(
  article: ArticleCandidate,
  pub: PublicationLocation,
): SeedIncident | null {
  const match = matchAnimalAttack(article.title, article.snippet);
  if (!match.matched) return null;

  const blob = `${article.title}\n${article.snippet}`;
  const cityState = blob.match(
    /\b([A-Z][A-Za-z]+(?:[ \t][A-Z][A-Za-z]+)?),\s*([A-Z]{2})\b/,
  );
  const cityMatch = blob.match(
    /\b(?:in|near|outside|at|près de|pres de)[ \t]+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'-]+(?:[ \t][A-ZÀ-Ÿ][A-Za-zÀ-ÿ'-]+)?)/,
  );
  const MONTHS = new Set([
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]);
  const rawCity = (cityState?.[1] ?? cityMatch?.[1] ?? null)?.replace(/\s+/g, " ").trim() ?? null;
  const cityFromArticle = rawCity && !MONTHS.has(rawCity) ? rawCity : null;
  let stateFromArticle: string | null = cityState?.[2] ?? null;
  if (
    stateFromArticle &&
    !CA_PROVINCE_NAMES[stateFromArticle] &&
    !MX_STATE_NAMES[stateFromArticle] &&
    !STATE_RE.some(([, abbr]) => abbr === stateFromArticle)
  ) {
    stateFromArticle = null;
  }
  if (!stateFromArticle) {
    const mxFirst = pub.country === "MX" || /\bM[eé]xico\b|\bMexico\b/i.test(blob);
    const order = mxFirst
      ? [...MX_STATE_RE, ...PROVINCE_RE, ...STATE_RE]
      : [...PROVINCE_RE, ...STATE_RE];
    for (const [re, abbr] of order) {
      if (re.test(`${article.title} ${article.snippet}`)) {
        stateFromArticle = abbr;
        break;
      }
    }
  }

  const city = cityFromArticle ?? pub.city ?? pub.town ?? null;
  const state = stateFromArticle ?? pub.state ?? null;
  let country = pub.country === "CA" ? "CA" : pub.country === "MX" ? "MX" : "US";
  if (state && CA_PROVINCE_NAMES[state]) country = "CA";
  else if (state && MX_STATE_NAMES[state]) country = "MX";
  else if (state && US_STATE_NAMES[state]) country = "US";
  const foreign =
    blob.match(/\bJapan\b|\bJap[oó]n\b/i) ? "JP"
    : blob.match(/\bSlovenia\b/i) ? "SI"
    : blob.match(/\bItaly\b|\bItalia\b/i) ? "IT"
    : blob.match(/\bRomania\b/i) ? "RO"
    : blob.match(/\bBrazil\b|\bBrasil\b/i) ? "BR"
    : blob.match(/\bIndia\b/i) ? "IN"
    : blob.match(/\bNorway\b|\bNoruega\b/i) ? "NO"
    : null;
  if (foreign && !CA_PROVINCE_NAMES[state ?? ""] && !/\b(Canada|B\.C\.|Alberta|Yukon|Nunavut|Ontario)\b/i.test(blob)) {
    country = foreign;
  }
  const hasPrecisePlace = Boolean(cityFromArticle);
  let lat = pub.lat ?? null;
  let lng = pub.lng ?? null;
  if (hasPrecisePlace || lat == null || lng == null) {
    const geo = offsetCoord(geocodeIncident({ city, stateProvince: state, country }), article.title);
    if (hasPrecisePlace || lat == null) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  const occurredAt = article.isoDate ? article.isoDate.slice(0, 10) : null;
  const snippet = (article.snippet || article.title).slice(0, 400);
  const isAgency = pub.circulationTier === "agency";

  return {
    title: article.title.slice(0, 180),
    species: match.species,
    subspecies: inferSubspecies(match.species, blob),
    occurredAt,
    datePrecision: occurredAt ? "exact" : "unknown",
    dateDisplay: occurredAt ?? "Date unknown",
    city,
    stateProvince: state,
    country,
    lat,
    lng,
    severity: inferSeverity(blob),
    summary: snippet,
    sourceType: isAgency ? "agency" : "news",
    verified: false,
    attribution: isAgency
      ? `Official agency / park press: ${pub.name}. Snippet only — confirm with the source.`
      : `Local newspaper crawl: ${pub.name}. Snippet only — not official agency data.`,
    publicationId: pub.id,
    sources: [
      {
        url: article.url,
        title: article.title,
        publisher: pub.name,
      },
    ],
  };
}
