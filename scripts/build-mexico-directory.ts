/**
 * Seed / refresh the Mexican local-news directory.
 *
 * Curated northern + jaguar / black-bear range papers first, then optional
 * Wikidata newspapers with P17=Mexico (CC0). Moose are N/A; elk is rare.
 *
 * ISO 3166-2:MX three-letter codes (BCN ≠ BC, NLE ≠ NL).
 */
import fs from "node:fs";
import path from "node:path";
import { isNationalOrJunkHost } from "../src/lib/publications/national";
import { normalizeHost, normalizeHomepage } from "../src/lib/publications/domain";
import { MX_STATE_NAMES, mxStateAbbr, WILDLIFE_MX_STATES } from "../src/lib/publications/states";
import { geocodeIncident } from "../src/lib/geo";
import type { PublicationSeed } from "../src/lib/publications/types";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "data/publications/mexico-local-news.json");
const UA = "animalattacks-tracker/1.0 (https://github.com/WillPowers3d/animalattacks; Mexico directory seed)";

type Curated = {
  name: string;
  url: string;
  city: string;
  state: string;
  rss?: string | null;
  tier?: PublicationSeed["circulationTier"];
};

/** Northern border + Sierra Madre + jaguar-range locals / regionals. */
const CURATED: Curated[] = [
  // Sonora
  { name: "El Imparcial", url: "https://www.elimparcial.com/", city: "Hermosillo", state: "SON", rss: "https://www.elimparcial.com/rss/portada.xml" },
  { name: "Proyecto Puente", url: "https://proyectopuente.com.mx/", city: "Hermosillo", state: "SON", rss: "https://proyectopuente.com.mx/feed/", tier: "digital" },
  { name: "Uniradio Noticias", url: "https://www.uniradionoticias.com/", city: "Hermosillo", state: "SON", rss: "https://www.uniradionoticias.com/rss" },
  { name: "El Sol de Hermosillo", url: "https://www.elsoldelhermosillo.com.mx/", city: "Hermosillo", state: "SON" },
  { name: "Expreso", url: "https://www.expreso.com.mx/", city: "Hermosillo", state: "SON" },
  { name: "Diario del Yaqui", url: "https://www.diariodelyaqui.mx/", city: "Ciudad Obregón", state: "SON" },
  { name: "Tribuna de San Luis Río Colorado", url: "https://www.tribunadelasanluis.com/", city: "Hermosillo", state: "SON" },
  { name: "Criterio Sonora", url: "https://criterio.sonora.gob.mx/", city: "Hermosillo", state: "SON", tier: "digital" },
  // Chihuahua
  { name: "El Diario de Chihuahua", url: "https://www.eldiariodechihuahua.mx/", city: "Chihuahua", state: "CHH" },
  { name: "El Heraldo de Chihuahua", url: "https://www.elheraldodechihuahua.com.mx/", city: "Chihuahua", state: "CHH" },
  { name: "El Diario de Juárez", url: "https://diario.mx/", city: "Ciudad Juárez", state: "CHH" },
  { name: "Norte Digital", url: "https://nortedigital.mx/", city: "Ciudad Juárez", state: "CHH", rss: "https://nortedigital.mx/feed/", tier: "digital" },
  { name: "Tiempo La Noticia Digital", url: "https://tiempo.com.mx/", city: "Chihuahua", state: "CHH", rss: "https://tiempo.com.mx/feed/", tier: "digital" },
  { name: "Omnia", url: "https://www.omnia.com.mx/", city: "Chihuahua", state: "CHH", rss: "https://www.omnia.com.mx/feed/" },
  { name: "Netnoticias", url: "https://netnoticias.mx/", city: "Ciudad Juárez", state: "CHH", rss: "https://netnoticias.mx/feed/", tier: "digital" },
  { name: "El Ágora", url: "https://www.elagora.com.mx/", city: "Chihuahua", state: "CHH", rss: "https://www.elagora.com.mx/feed/", tier: "digital" },
  { name: "Entre Líneas", url: "https://entrelineas.com.mx/", city: "Chihuahua", state: "CHH", rss: "https://entrelineas.com.mx/feed/", tier: "digital" },
  // Coahuila
  { name: "Vanguardia", url: "https://vanguardia.com.mx/", city: "Saltillo", state: "COA", rss: "https://vanguardia.com.mx/rss" },
  { name: "Zócalo Saltillo", url: "https://www.zocalo.com.mx/", city: "Saltillo", state: "COA" },
  { name: "El Siglo de Torreón", url: "https://www.elsiglodetorreon.com.mx/", city: "Torreón", state: "COA" },
  { name: "El Diario de Coahuila", url: "https://www.eldiariodecoahuila.com.mx/", city: "Saltillo", state: "COA" },
  { name: "La Prensa de Monclova", url: "https://www.laprensademonclova.com/", city: "Monclova", state: "COA" },
  { name: "Noticias del Sol de la Laguna", url: "https://www.elsoldelalaguna.com.mx/", city: "Torreón", state: "COA" },
  // Nuevo León
  { name: "ABC Noticias", url: "https://abcnoticias.mx/", city: "Monterrey", state: "NLE", rss: "https://abcnoticias.mx/rss" },
  { name: "El Horizonte", url: "https://www.elhorizonte.mx/", city: "Monterrey", state: "NLE" },
  { name: "Multimedios", url: "https://www.multimedios.com/", city: "Monterrey", state: "NLE" },
  { name: "Info7", url: "https://www.info7.mx/", city: "Monterrey", state: "NLE" },
  { name: "Telediario Monterrey", url: "https://www.telediario.mx/", city: "Monterrey", state: "NLE" },
  { name: "POSTA", url: "https://www.posta.com.mx/", city: "Monterrey", state: "NLE", rss: "https://www.posta.com.mx/rss", tier: "digital" },
  { name: "Mural", url: "https://www.mural.com.mx/", city: "Monterrey", state: "NLE" },
  { name: "Reporte Índigo Nuevo León", url: "https://www.reporteindigo.com/indigonl/", city: "Monterrey", state: "NLE", tier: "digital" },
  // Baja California
  { name: "Frontera", url: "https://www.frontera.info/", city: "Tijuana", state: "BCN" },
  { name: "Zeta Tijuana", url: "https://zetatijuana.com/", city: "Tijuana", state: "BCN", rss: "https://zetatijuana.com/feed/" },
  { name: "El Vigía", url: "https://www.elvigia.net/", city: "Ensenada", state: "BCN" },
  { name: "AFN Tijuana", url: "https://afntijuana.info/", city: "Tijuana", state: "BCN", rss: "https://afntijuana.info/feed/", tier: "digital" },
  { name: "La Voz de la Frontera", url: "https://www.lavozdelafrontera.com.mx/", city: "Mexicali", state: "BCN" },
  { name: "El Mexicano", url: "https://www.el-mexicano.com.mx/", city: "Tijuana", state: "BCN" },
  { name: "Cadena Noticias", url: "https://cadenanoticias.com/", city: "Tijuana", state: "BCN", rss: "https://cadenanoticias.com/feed/", tier: "digital" },
  { name: "Uniradio Tijuana", url: "https://www.uniradiobaja.com/", city: "Tijuana", state: "BCN" },
  { name: "El Sol de Tijuana", url: "https://www.elsoldetijuana.com.mx/", city: "Tijuana", state: "BCN" },
  { name: "El Sol de Mexicali", url: "https://www.elsoldemexicali.com.mx/", city: "Mexicali", state: "BCN" },
  // Baja California Sur
  { name: "El Sudcaliforniano", url: "https://www.elsudcaliforniano.com.mx/", city: "La Paz", state: "BCS" },
  { name: "BCS Noticias", url: "https://www.bcsnoticias.mx/", city: "La Paz", state: "BCS", rss: "https://www.bcsnoticias.mx/feed/", tier: "digital" },
  { name: "Diario El Independiente", url: "https://www.diarioelindependiente.mx/", city: "La Paz", state: "BCS" },
  { name: "Colectivo Pericú", url: "https://www.colectivopericu.net/", city: "La Paz", state: "BCS", rss: "https://www.colectivopericu.net/feed/", tier: "digital" },
  { name: "CPS Noticias", url: "https://cpsnoticias.com/", city: "La Paz", state: "BCS", rss: "https://cpsnoticias.com/feed/", tier: "digital" },
  // Sinaloa (jaguar / black-bear fringe)
  { name: "El Debate", url: "https://www.debate.com.mx/", city: "Culiacán", state: "SIN" },
  { name: "Noroeste", url: "https://www.noroeste.com.mx/", city: "Culiacán", state: "SIN" },
  { name: "Línea Directa", url: "https://www.lineadirectaportal.com/", city: "Culiacán", state: "SIN", rss: "https://www.lineadirectaportal.com/rss", tier: "digital" },
  { name: "Ríodoce", url: "https://riodoce.mx/", city: "Culiacán", state: "SIN", rss: "https://riodoce.mx/feed/" },
  { name: "Luz Noticias", url: "https://www.luznoticias.mx/", city: "Culiacán", state: "SIN", rss: "https://www.luznoticias.mx/feed/", tier: "digital" },
  { name: "El Sol de Culiacán", url: "https://www.elsoldeculiacan.com.mx/", city: "Culiacán", state: "SIN" },
  { name: "El Sol de Mazatlán", url: "https://www.elsoldemazatlan.com.mx/", city: "Mazatlán", state: "SIN" },
  // Durango
  { name: "El Siglo de Durango", url: "https://www.elsiglodedurango.com.mx/", city: "Durango", state: "DUR" },
  { name: "El Sol de Durango", url: "https://www.elsoldedurango.com.mx/", city: "Durango", state: "DUR" },
  { name: "Contexto de Durango", url: "https://www.contextodedurango.com.mx/", city: "Durango", state: "DUR", rss: "https://www.contextodedurango.com.mx/feed/", tier: "digital" },
  // Tamaulipas
  { name: "El Mañana", url: "https://www.elmanana.com/", city: "Reynosa", state: "TAM" },
  { name: "Hoy Tamaulipas", url: "https://www.hoytamaulipas.net/", city: "Ciudad Victoria", state: "TAM", rss: "https://www.hoytamaulipas.net/rss.xml", tier: "digital" },
  { name: "El Sol de Tampico", url: "https://www.elsoldetampico.com.mx/", city: "Tampico", state: "TAM" },
  { name: "La Verdad de Tamaulipas", url: "https://laverdad.com.mx/", city: "Ciudad Victoria", state: "TAM" },
  { name: "Hora Cero", url: "https://horacero.com.mx/", city: "Nuevo Laredo", state: "TAM", rss: "https://horacero.com.mx/feed/", tier: "digital" },
  // Jalisco / Nayarit / Michoacán (jaguar Pacific)
  { name: "El Informador", url: "https://www.informador.mx/", city: "Guadalajara", state: "JAL" },
  { name: "El Occidental", url: "https://www.eloccidental.com.mx/", city: "Guadalajara", state: "JAL" },
  { name: "UDG Noticias", url: "https://udgtv.com/", city: "Guadalajara", state: "JAL", rss: "https://udgtv.com/feed/", tier: "digital" },
  { name: "Zona Docs", url: "https://www.zonadocs.mx/", city: "Guadalajara", state: "JAL", rss: "https://www.zonadocs.mx/feed/", tier: "digital" },
  { name: "La Voz de Michoacán", url: "https://www.lavozdemichoacan.com.mx/", city: "Morelia", state: "MIC" },
  { name: "Quadratín Michoacán", url: "https://www.quadratin.com.mx/", city: "Morelia", state: "MIC" },
  { name: "MiMorelia", url: "https://www.mimorelia.com/", city: "Morelia", state: "MIC", rss: "https://www.mimorelia.com/feed/", tier: "digital" },
  { name: "Provincia", url: "https://www.provincia.com.mx/", city: "Morelia", state: "MIC" },
  { name: "El Sol de Morelia", url: "https://www.elsoldemorelia.com.mx/", city: "Morelia", state: "MIC" },
  { name: "Nayarit en Línea", url: "https://www.nayaritenlinea.mx/", city: "Tepic", state: "NAY", rss: "https://www.nayaritenlinea.mx/feed/", tier: "digital" },
  { name: "Meridiano.mx", url: "https://meridiano.mx/", city: "Tepic", state: "NAY", rss: "https://meridiano.mx/feed/", tier: "digital" },
  // Guerrero / Oaxaca / Chiapas (jaguar south)
  { name: "El Sur de Acapulco", url: "https://suracapulco.mx/", city: "Acapulco", state: "GRO", rss: "https://suracapulco.mx/feed/" },
  { name: "Quadratín Guerrero", url: "https://guerrero.quadratin.com.mx/", city: "Chilpancingo", state: "GRO" },
  { name: "El Sol de Acapulco", url: "https://www.elsoldeacapulco.com.mx/", city: "Acapulco", state: "GRO" },
  { name: "NVI Noticias", url: "https://www.nvinoticias.com/", city: "Oaxaca", state: "OAX" },
  { name: "El Imparcial de Oaxaca", url: "https://imparcialoaxaca.mx/", city: "Oaxaca", state: "OAX", rss: "https://imparcialoaxaca.mx/feed/" },
  { name: "Página 3", url: "https://pagina3.mx/", city: "Oaxaca", state: "OAX", rss: "https://pagina3.mx/feed/", tier: "digital" },
  { name: "Chiapas Paralelo", url: "https://www.chiapasparalelo.com/", city: "Tuxtla Gutiérrez", state: "CHP", rss: "https://www.chiapasparalelo.com/feed/", tier: "digital" },
  { name: "Cuarto Poder", url: "https://www.cuartopoder.mx/", city: "Tuxtla Gutiérrez", state: "CHP" },
  { name: "El Heraldo de Chiapas", url: "https://www.elheraldodechiapas.com.mx/", city: "Tuxtla Gutiérrez", state: "CHP" },
  { name: "Diario del Sur", url: "https://www.diariodelsur.com.mx/", city: "Tapachula", state: "CHP" },
  { name: "Diario de Chiapas", url: "https://www.diariodechiapas.com/", city: "Tuxtla Gutiérrez", state: "CHP", rss: "https://www.diariodechiapas.com/feed/" },
  { name: "NSS Oaxaca", url: "https://www.nssoaxaca.com/", city: "Oaxaca", state: "OAX", rss: "https://www.nssoaxaca.com/feed/", tier: "digital" },
  { name: "El Sol de Oaxaca", url: "https://www.elsoldeoaxaca.com.mx/", city: "Oaxaca", state: "OAX" },
  { name: "Diario Presente", url: "https://www.diariopresente.mx/", city: "Villahermosa", state: "TAB", rss: "https://www.diariopresente.mx/feed/" },
  { name: "Tabasco HOY", url: "https://www.tabascohoy.com/", city: "Villahermosa", state: "TAB", rss: "https://www.tabascohoy.com/feed/" },
  { name: "El Heraldo de Tabasco", url: "https://www.elheraldodetabasco.com.mx/", city: "Villahermosa", state: "TAB" },
  { name: "Diario de Xalapa", url: "https://www.diariodexalapa.com.mx/", city: "Xalapa", state: "VER" },
  { name: "Imagen del Golfo", url: "https://imagendelgolfo.mx/", city: "Xalapa", state: "VER", rss: "https://imagendelgolfo.mx/feed/", tier: "digital" },
  { name: "AVC Noticias", url: "https://www.avcnoticias.com.mx/", city: "Xalapa", state: "VER", rss: "https://www.avcnoticias.com.mx/feed/", tier: "digital" },
  { name: "Al Calor Político", url: "https://www.alcalorpolitico.com/", city: "Xalapa", state: "VER", rss: "https://www.alcalorpolitico.com/feed/", tier: "digital" },
  { name: "Campeche HOY", url: "https://www.campechehoy.com/", city: "Campeche", state: "CAM", tier: "digital" },
  // Yucatán peninsula (jaguar)
  { name: "SIPSE", url: "https://sipse.com/", city: "Mérida", state: "YUC" },
  { name: "La Jornada Maya", url: "https://www.lajornadamaya.mx/", city: "Mérida", state: "YUC", rss: "https://www.lajornadamaya.mx/rss" },
  { name: "Diario de Yucatán", url: "https://www.yucatan.com.mx/", city: "Mérida", state: "YUC" },
  { name: "Por Esto!", url: "https://www.poresto.net/", city: "Mérida", state: "YUC" },
  { name: "Quequi", url: "https://www.quequi.com.mx/", city: "Cancún", state: "ROO", rss: "https://www.quequi.com.mx/feed/" },
  { name: "Luces del Siglo", url: "https://lucesdelsiglo.com/", city: "Cancún", state: "ROO", rss: "https://lucesdelsiglo.com/feed/", tier: "digital" },
  { name: "Novedades Quintana Roo", url: "https://sipse.com/novedades/", city: "Cancún", state: "ROO" },
  { name: "Tribuna Campeche", url: "https://tribunacampeche.com/", city: "Campeche", state: "CAM", rss: "https://tribunacampeche.com/feed/" },
  { name: "El Independiente de Campeche", url: "https://www.independiente.mx/", city: "Campeche", state: "CAM" },
  { name: "The Yucatan Times", url: "https://www.theyucatantimes.com/", city: "Mérida", state: "YUC", rss: "https://www.theyucatantimes.com/feed/", tier: "digital" },
  // Zacatecas / SLP (black-bear fringe)
  { name: "NTR Zacatecas", url: "https://ntrzacatecas.com/", city: "Zacatecas", state: "ZAC", rss: "https://ntrzacatecas.com/feed/", tier: "digital" },
  { name: "El Sol de Zacatecas", url: "https://www.elsoldezacatecas.com.mx/", city: "Zacatecas", state: "ZAC" },
  { name: "Página 24 Zacatecas", url: "https://pagina24.com.mx/", city: "Zacatecas", state: "ZAC", rss: "https://pagina24.com.mx/feed/", tier: "digital" },
  { name: "Plano Informativo", url: "https://planoinformativo.com/", city: "San Luis Potosí", state: "SLP", rss: "https://planoinformativo.com/rss", tier: "digital" },
  { name: "Pulso SLP", url: "https://pulsoslp.com.mx/", city: "San Luis Potosí", state: "SLP" },
  { name: "El Sol de San Luis", url: "https://www.elsoldesanluis.com.mx/", city: "San Luis Potosí", state: "SLP" },
  // English / digital that cover wildlife nationwide
  { name: "Mexico News Daily", url: "https://mexiconewsdaily.com/", city: "Mexico City", state: "CMX", rss: "https://mexiconewsdaily.com/feed/", tier: "digital" },
  { name: "Animal Político", url: "https://www.animalpolitico.com/", city: "Mexico City", state: "CMX", rss: "https://www.animalpolitico.com/feed/", tier: "digital" },
];

type Acc = PublicationSeed & { sources: Set<string> };
const byDomain = new Map<string, Acc>();

function remember(
  raw: {
    name?: string | null;
    url?: string | null;
    city?: string | null;
    town?: string | null;
    state?: string | null;
    lat?: number | null;
    lng?: number | null;
    rssUrl?: string | null;
    wikidataId?: string | null;
    notes?: string | null;
    tier?: PublicationSeed["circulationTier"];
    domain?: string | null;
  },
  source: string,
) {
  const homepageUrl = raw.url ? normalizeHomepage(raw.url) : null;
  const host = raw.domain ?? (homepageUrl ? normalizeHost(homepageUrl) : null);
  if (!host || !homepageUrl) return;
  if (isNationalOrJunkHost(host)) return;
  if (/\.gob\.mx$/i.test(host)) return;
  const name = (raw.name ?? host).replace(/\s+/g, " ").trim();
  if (!name || name.length < 2) return;
  const state = mxStateAbbr(raw.state) ?? raw.state ?? null;
  const city = raw.city ?? raw.town ?? null;
  const prev = byDomain.get(host);
  if (!prev) {
    byDomain.set(host, {
      name,
      homepageUrl,
      domain: host,
      rssUrl: raw.rssUrl ?? null,
      town: city,
      city,
      state,
      country: "MX",
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      circulationTier: raw.tier ?? "newspaper",
      directorySource: source,
      wikidataId: raw.wikidataId ?? null,
      notes: raw.notes ?? null,
      sources: new Set([source]),
    });
    return;
  }
  prev.sources.add(source);
  if (raw.rssUrl && !prev.rssUrl) prev.rssUrl = raw.rssUrl;
  if (city && !prev.city) {
    prev.city = city;
    prev.town = city;
  }
  if (state && !prev.state) prev.state = state;
  if (raw.lat != null && prev.lat == null) {
    prev.lat = raw.lat;
    prev.lng = raw.lng ?? null;
  }
  if (raw.wikidataId && !prev.wikidataId) prev.wikidataId = raw.wikidataId;
  if (name.length > prev.name.length && /[A-Z]/.test(name)) prev.name = name;
}

function loadCurated() {
  for (const p of CURATED) {
    remember(
      {
        name: p.name,
        url: p.url,
        city: p.city,
        state: p.state,
        rssUrl: p.rss ?? null,
        tier: p.tier ?? "newspaper",
      },
      "curated-mexico",
    );
  }
  return CURATED.length;
}

async function loadWikidata() {
  const sparql = `SELECT DISTINCT ?item ?itemLabel ?website ?coord ?stateLabel ?cityLabel WHERE {
    ?item wdt:P31/wdt:P279* wd:Q11032;
          wdt:P17 wd:Q96;
          wdt:P856 ?website.
    OPTIONAL { ?item wdt:P625 ?coord. }
    OPTIONAL {
      ?item wdt:P131+ ?state.
      ?state wdt:P31/wdt:P279* wd:Q852101.
    }
    OPTIONAL { ?item wdt:P159 ?city. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
    });
    if (!res.ok) {
      console.warn(`  wikidata ${res.status}`);
      return;
    }
    const json = (await res.json()) as {
      results: { bindings: Record<string, { value: string }>[] };
    };
    let n = 0;
    for (const b of json.results.bindings) {
      const coord = b.coord?.value;
      let lat: number | null = null;
      let lng: number | null = null;
      const pt = coord?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
      if (pt) {
        lng = Number(pt[1]);
        lat = Number(pt[2]);
      }
      remember(
        {
          name: b.itemLabel?.value,
          url: b.website?.value,
          city: b.cityLabel?.value,
          state: mxStateAbbr(b.stateLabel?.value),
          lat,
          lng,
          wikidataId: b.item?.value?.split("/").pop(),
        },
        "wikidata",
      );
      n += 1;
    }
    console.log(`  wikidata rows: ${n}`);
  } catch (err) {
    console.warn("  wikidata error", err);
  }
}

function inferMissingStates() {
  let n = 0;
  for (const pub of byDomain.values()) {
    if (pub.state) continue;
    const blob = `${pub.name} ${pub.domain} ${pub.city ?? ""} ${pub.town ?? ""}`.toLowerCase();
    const hints: [RegExp, string][] = [
      [/\bsonora|hermosillo|obreg[oó]n|navojoa|nogales\b/, "SON"],
      [/\bchihuahua|ju[aá]rez|parral|creel\b/, "CHH"],
      [/\bcoahuila|saltillo|torre[oó]n|monclova\b/, "COA"],
      [/\bnuevo le[oó]n|monterrey\b/, "NLE"],
      [/\btijuana|mexicali|ensenada|baja california\b/, "BCN"],
      [/\bla paz|los cabos|sudcaliforn/, "BCS"],
      [/\bsinaloa|culiac[aá]n|mazatl[aá]n\b/, "SIN"],
      [/\bdurango\b/, "DUR"],
      [/\btamaulipas|reynosa|tampico|matamoros\b/, "TAM"],
      [/\bjalisco|guadalajara|vallarta\b/, "JAL"],
      [/\bmichoac|morelia\b/, "MIC"],
      [/\bnayarit|tepic\b/, "NAY"],
      [/\bguerrero|acapulco\b/, "GRO"],
      [/\boaxaca\b/, "OAX"],
      [/\bchiapas|tuxtla\b/, "CHP"],
      [/\byucat[aá]n|m[eé]rida\b/, "YUC"],
      [/\bcanc[uú]n|quintana roo|chetumal\b/, "ROO"],
      [/\bcampeche\b/, "CAM"],
      [/\bzacatecas\b/, "ZAC"],
      [/\bsan luis potos/, "SLP"],
    ];
    for (const [re, abbr] of hints) {
      if (re.test(blob)) {
        pub.state = abbr;
        n += 1;
        break;
      }
    }
  }
  console.log(`  inferred states: ${n}`);
}

function geocodeMissing() {
  let filled = 0;
  for (const pub of byDomain.values()) {
    if (pub.lat != null && pub.lng != null) continue;
    const geo = geocodeIncident({
      city: pub.city ?? pub.town,
      stateProvince: pub.state,
      country: "MX",
    });
    pub.lat = geo.lat;
    pub.lng = geo.lng;
    filled += 1;
  }
  console.log(`  geocoded ${filled} missing coords`);
}

function finalize(): PublicationSeed[] {
  const rank = (p: Acc) => {
    const i = (WILDLIFE_MX_STATES as readonly string[]).indexOf(p.state ?? "");
    return i === -1 ? 50 : i;
  };
  return [...byDomain.values()]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((p) => ({
      name: p.name,
      homepageUrl: p.homepageUrl,
      domain: p.domain,
      rssUrl: p.rssUrl,
      town: p.town,
      city: p.city,
      state: p.state,
      country: "MX" as const,
      lat: p.lat,
      lng: p.lng,
      circulationTier: p.circulationTier ?? "newspaper",
      directorySource: [...p.sources].sort().join("+"),
      wikidataId: p.wikidataId,
      notes: p.notes,
    }));
}

async function main() {
  const curated = loadCurated();
  console.log(`  curated: ${curated}`);
  if (!process.argv.includes("--curated-only")) {
    await loadWikidata();
  }
  inferMissingStates();
  geocodeMissing();
  const seeds = finalize();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(seeds, null, 2)}\n`);
  const byState: Record<string, number> = {};
  for (const p of seeds) {
    const k = p.state ?? "??";
    byState[k] = (byState[k] ?? 0) + 1;
  }
  console.log(
    JSON.stringify(
      {
        total: seeds.length,
        withRss: seeds.filter((p) => p.rssUrl).length,
        withState: seeds.filter((p) => p.state).length,
        states: byState,
        knownStates: Object.keys(MX_STATE_NAMES).length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
