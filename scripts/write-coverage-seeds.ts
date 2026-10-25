/**
 * Emit curated Canadian local-news + official agency/park feed seeds.
 * Facts only: name, homepage, optional RSS, town, region, coords.
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeHost, normalizeHomepage } from "../src/lib/publications/domain";
import type { PublicationSeed } from "../src/lib/publications/types";

const ROOT = path.join(import.meta.dirname, "..");

type Row = {
  name: string;
  url: string;
  rss?: string;
  town: string;
  state: string;
  country: "US" | "CA";
  lat: number;
  lng: number;
  tier?: PublicationSeed["circulationTier"];
  source?: string;
  notes?: string;
  domain?: string;
};

function toSeed(row: Row): PublicationSeed | null {
  const homepageUrl = normalizeHomepage(row.url);
  const domain = row.domain ?? (homepageUrl ? normalizeHost(homepageUrl) : null);
  if (!homepageUrl || !domain) return null;
  return {
    name: row.name,
    homepageUrl,
    domain,
    rssUrl: row.rss ?? null,
    town: row.town,
    city: row.town,
    state: row.state,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    circulationTier: row.tier ?? "newspaper",
    directorySource: row.source ?? (row.country === "CA" ? "curated-canada" : "curated-agency"),
    notes: row.notes ?? null,
  };
}

const CANADA: Row[] = [
  // Yukon / NWT / Nunavut
  { name: "Yukon News", url: "https://www.yukon-news.com/", rss: "https://www.yukon-news.com/feed/", town: "Whitehorse", state: "YT", country: "CA", lat: 60.7212, lng: -135.0568 },
  { name: "Whitehorse Daily Star", url: "https://www.whitehorsestar.com/", town: "Whitehorse", state: "YT", country: "CA", lat: 60.7212, lng: -135.0568 },
  { name: "What's Up Yukon", url: "https://whatsupyukon.com/", rss: "https://whatsupyukon.com/feed/", town: "Whitehorse", state: "YT", country: "CA", lat: 60.7212, lng: -135.0568, tier: "digital" },
  { name: "Cabin Radio", url: "https://cabinradio.ca/", rss: "https://cabinradio.ca/feed/", town: "Yellowknife", state: "NT", country: "CA", lat: 62.454, lng: -114.3718, tier: "digital" },
  { name: "NNSL Media", url: "https://www.nnsl.com/", rss: "https://www.nnsl.com/feed/", town: "Yellowknife", state: "NT", country: "CA", lat: 62.454, lng: -114.3718 },
  { name: "Nunatsiaq News", url: "https://nunatsiaq.com/", rss: "https://nunatsiaq.com/feed/", town: "Iqaluit", state: "NU", country: "CA", lat: 63.7467, lng: -68.517 },
  { name: "Nunavut News", url: "https://www.nunavutnews.com/", rss: "https://www.nunavutnews.com/feed/", town: "Iqaluit", state: "NU", country: "CA", lat: 63.7467, lng: -68.517 },

  // British Columbia — coast / Island
  { name: "Times Colonist", url: "https://www.timescolonist.com/", rss: "https://www.timescolonist.com/rss.xml", town: "Victoria", state: "BC", country: "CA", lat: 48.4284, lng: -123.3656 },
  { name: "Victoria News", url: "https://www.vicnews.com/", rss: "https://www.vicnews.com/feed/", town: "Victoria", state: "BC", country: "CA", lat: 48.4284, lng: -123.3656 },
  { name: "Saanich News", url: "https://www.saanichnews.com/", rss: "https://www.saanichnews.com/feed/", town: "Saanich", state: "BC", country: "CA", lat: 48.484, lng: -123.381 },
  { name: "Oak Bay News", url: "https://www.oakbaynews.com/", rss: "https://www.oakbaynews.com/feed/", town: "Oak Bay", state: "BC", country: "CA", lat: 48.426, lng: -123.316 },
  { name: "Nanaimo News Bulletin", url: "https://www.nanaimobulletin.com/", rss: "https://www.nanaimobulletin.com/feed/", town: "Nanaimo", state: "BC", country: "CA", lat: 49.1659, lng: -123.9401 },
  { name: "Parksville Qualicum Beach News", url: "https://www.pqbnews.com/", rss: "https://www.pqbnews.com/feed/", town: "Parksville", state: "BC", country: "CA", lat: 49.319, lng: -124.314 },
  { name: "Alberni Valley News", url: "https://www.albernivalleynews.com/", rss: "https://www.albernivalleynews.com/feed/", town: "Port Alberni", state: "BC", country: "CA", lat: 49.233, lng: -124.805 },
  { name: "Comox Valley Record", url: "https://www.comoxvalleyrecord.com/", rss: "https://www.comoxvalleyrecord.com/feed/", town: "Courtenay", state: "BC", country: "CA", lat: 49.687, lng: -124.994 },
  { name: "Campbell River Mirror", url: "https://www.campbellrivermirror.com/", rss: "https://www.campbellrivermirror.com/feed/", town: "Campbell River", state: "BC", country: "CA", lat: 50.024, lng: -125.247 },
  { name: "North Island Gazette", url: "https://www.northislandgazette.com/", rss: "https://www.northislandgazette.com/feed/", town: "Port Hardy", state: "BC", country: "CA", lat: 50.718, lng: -127.498 },
  { name: "Cowichan Valley Citizen", url: "https://www.cowichanvalleycitizen.com/", rss: "https://www.cowichanvalleycitizen.com/feed/", town: "Duncan", state: "BC", country: "CA", lat: 48.778, lng: -123.708 },
  { name: "Gulf Islands Driftwood", url: "https://www.gulfislandsdriftwood.com/", rss: "https://www.gulfislandsdriftwood.com/feed/", town: "Salt Spring Island", state: "BC", country: "CA", lat: 48.85, lng: -123.5 },
  { name: "Westerly News", url: "https://www.westerlynews.ca/", rss: "https://www.westerlynews.ca/feed/", town: "Ucluelet", state: "BC", country: "CA", lat: 48.941, lng: -125.546 },
  { name: "Haida Gwaii Observer", url: "https://www.haidagwaiiobserver.com/", rss: "https://www.haidagwaiiobserver.com/feed/", town: "Queen Charlotte", state: "BC", country: "CA", lat: 53.255, lng: -132.09 },

  // BC North / Coast
  { name: "Prince Rupert Northern View", url: "https://www.thenorthernview.com/", rss: "https://www.thenorthernview.com/feed/", town: "Prince Rupert", state: "BC", country: "CA", lat: 54.315, lng: -130.321 },
  { name: "Kitimat Northern Sentinel", url: "https://www.northern-sentinel.com/", rss: "https://www.northern-sentinel.com/feed/", town: "Kitimat", state: "BC", country: "CA", lat: 54.054, lng: -128.653 },
  { name: "Terrace Standard", url: "https://www.terracestandard.com/", rss: "https://www.terracestandard.com/feed/", town: "Terrace", state: "BC", country: "CA", lat: 54.518, lng: -128.603 },
  { name: "Interior News", url: "https://www.interior-news.com/", rss: "https://www.interior-news.com/feed/", town: "Smithers", state: "BC", country: "CA", lat: 54.782, lng: -127.168 },
  { name: "Houston Today", url: "https://www.houston-today.com/", rss: "https://www.houston-today.com/feed/", town: "Houston", state: "BC", country: "CA", lat: 54.398, lng: -126.642 },
  { name: "Lakes District News", url: "https://www.ldnews.net/", rss: "https://www.ldnews.net/feed/", town: "Burns Lake", state: "BC", country: "CA", lat: 54.23, lng: -125.763 },
  { name: "Omineca Express", url: "https://www.ominecaexpress.com/", rss: "https://www.ominecaexpress.com/feed/", town: "Vanderhoof", state: "BC", country: "CA", lat: 54.014, lng: -124.013 },
  { name: "Prince George Citizen", url: "https://www.princegeorgecitizen.com/", rss: "https://www.princegeorgecitizen.com/feed/", town: "Prince George", state: "BC", country: "CA", lat: 53.9171, lng: -122.7497 },
  { name: "myPrinceGeorgeNow", url: "https://www.myprincegeorgenow.com/", rss: "https://www.myprincegeorgenow.com/feed/", town: "Prince George", state: "BC", country: "CA", lat: 53.9171, lng: -122.7497, tier: "digital" },
  { name: "Quesnel Cariboo Observer", url: "https://www.quesnelobserver.com/", rss: "https://www.quesnelobserver.com/feed/", town: "Quesnel", state: "BC", country: "CA", lat: 52.978, lng: -122.493 },
  { name: "Williams Lake Tribune", url: "https://www.wltribune.com/", rss: "https://www.wltribune.com/feed/", town: "Williams Lake", state: "BC", country: "CA", lat: 52.141, lng: -122.142 },
  { name: "100 Mile House Free Press", url: "https://www.100milefreepress.net/", rss: "https://www.100milefreepress.net/feed/", town: "100 Mile House", state: "BC", country: "CA", lat: 51.644, lng: -121.295 },
  { name: "Alaska Highway News", url: "https://www.alaskahighwaynews.ca/", rss: "https://www.alaskahighwaynews.ca/feed/", town: "Fort St. John", state: "BC", country: "CA", lat: 56.252, lng: -120.847 },
  { name: "Energetic City", url: "https://www.energeticcity.ca/", rss: "https://www.energeticcity.ca/feed/", town: "Fort St. John", state: "BC", country: "CA", lat: 56.252, lng: -120.847, tier: "digital" },
  { name: "Dawson Creek Mirror", url: "https://www.dawsoncreekmirror.ca/", rss: "https://www.dawsoncreekmirror.ca/feed/", town: "Dawson Creek", state: "BC", country: "CA", lat: 55.761, lng: -120.236 },

  // BC Interior / Kootenays / Sea-to-Sky
  { name: "Kamloops This Week", url: "https://www.kamloopsthisweek.com/", rss: "https://www.kamloopsthisweek.com/feed/", town: "Kamloops", state: "BC", country: "CA", lat: 50.6745, lng: -120.3273 },
  { name: "Castanet Kamloops", url: "https://www.castanetkamloops.net/", town: "Kamloops", state: "BC", country: "CA", lat: 50.6745, lng: -120.3273, tier: "digital" },
  { name: "Salmon Arm Observer", url: "https://www.saobserver.net/", rss: "https://www.saobserver.net/feed/", town: "Salmon Arm", state: "BC", country: "CA", lat: 50.7, lng: -119.284 },
  { name: "Revelstoke Review", url: "https://www.revelstokereview.com/", rss: "https://www.revelstokereview.com/feed/", town: "Revelstoke", state: "BC", country: "CA", lat: 50.9981, lng: -118.1957 },
  { name: "Revelstoke Mountaineer", url: "https://www.revelstokemountaineer.com/", rss: "https://www.revelstokemountaineer.com/feed/", town: "Revelstoke", state: "BC", country: "CA", lat: 50.9981, lng: -118.1957, tier: "digital" },
  { name: "The Golden Star", url: "https://www.thegoldenstar.net/", rss: "https://www.thegoldenstar.net/feed/", town: "Golden", state: "BC", country: "CA", lat: 51.296, lng: -116.963 },
  { name: "Columbia Valley Pioneer", url: "https://www.columbiavalleypioneer.com/", rss: "https://www.columbiavalleypioneer.com/feed/", town: "Invermere", state: "BC", country: "CA", lat: 50.505, lng: -116.03 },
  { name: "Cranbrook Townsman", url: "https://www.cranbrooktownsman.com/", rss: "https://www.cranbrooktownsman.com/feed/", town: "Cranbrook", state: "BC", country: "CA", lat: 49.512, lng: -115.769 },
  { name: "Kimberley Bulletin", url: "https://www.kimberleybulletin.com/", rss: "https://www.kimberleybulletin.com/feed/", town: "Kimberley", state: "BC", country: "CA", lat: 49.67, lng: -115.985 },
  { name: "The Free Press (Fernie)", url: "https://www.thefreepress.ca/", rss: "https://www.thefreepress.ca/feed/", town: "Fernie", state: "BC", country: "CA", lat: 49.504, lng: -115.063 },
  { name: "Trail Times", url: "https://www.trailtimes.ca/", rss: "https://www.trailtimes.ca/feed/", town: "Trail", state: "BC", country: "CA", lat: 49.095, lng: -117.71 },
  { name: "Nelson Star", url: "https://www.nelsonstar.com/", rss: "https://www.nelsonstar.com/feed/", town: "Nelson", state: "BC", country: "CA", lat: 49.493, lng: -117.295 },
  { name: "Castlegar News", url: "https://www.castlegarnews.com/", rss: "https://www.castlegarnews.com/feed/", town: "Castlegar", state: "BC", country: "CA", lat: 49.324, lng: -117.659 },
  { name: "Creston Valley Advance", url: "https://www.crestonvalleyadvance.ca/", rss: "https://www.crestonvalleyadvance.ca/feed/", town: "Creston", state: "BC", country: "CA", lat: 49.096, lng: -116.514 },
  { name: "Grand Forks Gazette", url: "https://www.grandforksgazette.ca/", rss: "https://www.grandforksgazette.ca/feed/", town: "Grand Forks", state: "BC", country: "CA", lat: 49.033, lng: -118.44 },
  { name: "Penticton Western News", url: "https://www.pentictonwesternnews.com/", rss: "https://www.pentictonwesternnews.com/feed/", town: "Penticton", state: "BC", country: "CA", lat: 49.4991, lng: -119.5937 },
  { name: "Castanet Kelowna", url: "https://www.castanet.net/", town: "Kelowna", state: "BC", country: "CA", lat: 49.888, lng: -119.496, tier: "digital" },
  { name: "Kelowna Capital News", url: "https://www.kelownacapnews.com/", rss: "https://www.kelownacapnews.com/feed/", town: "Kelowna", state: "BC", country: "CA", lat: 49.888, lng: -119.496 },
  { name: "Vernon Morning Star", url: "https://www.vernonmorningstar.com/", rss: "https://www.vernonmorningstar.com/feed/", town: "Vernon", state: "BC", country: "CA", lat: 50.267, lng: -119.272 },
  { name: "Summerland Review", url: "https://www.summerlandreview.com/", rss: "https://www.summerlandreview.com/feed/", town: "Summerland", state: "BC", country: "CA", lat: 49.601, lng: -119.678 },
  { name: "Merritt Herald", url: "https://www.merrittherald.com/", rss: "https://www.merrittherald.com/feed/", town: "Merritt", state: "BC", country: "CA", lat: 50.112, lng: -120.786 },
  { name: "The Squamish Chief", url: "https://www.squamishchief.com/", rss: "https://www.squamishchief.com/feed/", town: "Squamish", state: "BC", country: "CA", lat: 49.7016, lng: -123.1558 },
  { name: "Pique Newsmagazine", url: "https://www.piquenewsmagazine.com/", rss: "https://www.piquenewsmagazine.com/feed/", town: "Whistler", state: "BC", country: "CA", lat: 50.1163, lng: -122.9574 },
  { name: "North Shore News", url: "https://www.nsnews.com/", rss: "https://www.nsnews.com/feed/", town: "North Vancouver", state: "BC", country: "CA", lat: 49.32, lng: -123.072 },
  { name: "Coast Reporter", url: "https://www.coastreporter.net/", rss: "https://www.coastreporter.net/feed/", town: "Gibsons", state: "BC", country: "CA", lat: 49.397, lng: -123.507 },
  { name: "Powell River Peak", url: "https://www.prpeak.com/", rss: "https://www.prpeak.com/feed/", town: "Powell River", state: "BC", country: "CA", lat: 49.835, lng: -124.525 },
  { name: "Hope Standard", url: "https://www.hopestandard.com/", rss: "https://www.hopestandard.com/feed/", town: "Hope", state: "BC", country: "CA", lat: 49.386, lng: -121.442 },
  { name: "Chilliwack Progress", url: "https://www.theprogress.com/", rss: "https://www.theprogress.com/feed/", town: "Chilliwack", state: "BC", country: "CA", lat: 49.158, lng: -121.951 },
  { name: "Abbotsford News", url: "https://www.abbynews.com/", rss: "https://www.abbynews.com/feed/", town: "Abbotsford", state: "BC", country: "CA", lat: 49.0504, lng: -122.3045 },
  { name: "The Province", url: "https://theprovince.com/", rss: "https://theprovince.com/feed/", town: "Vancouver", state: "BC", country: "CA", lat: 49.2827, lng: -123.1207 },
  { name: "Vancouver Sun", url: "https://vancouversun.com/", rss: "https://vancouversun.com/feed/", town: "Vancouver", state: "BC", country: "CA", lat: 49.2827, lng: -123.1207 },
  { name: "The Tyee", url: "https://thetyee.ca/", rss: "https://thetyee.ca/rss2.xml", town: "Vancouver", state: "BC", country: "CA", lat: 49.2827, lng: -123.1207, tier: "digital" },
  { name: "The Narwhal", url: "https://thenarwhal.ca/", rss: "https://thenarwhal.ca/feed/", town: "Victoria", state: "BC", country: "CA", lat: 48.4284, lng: -123.3656, tier: "digital" },

  // Alberta
  { name: "Calgary Herald", url: "https://calgaryherald.com/", rss: "https://calgaryherald.com/feed/", town: "Calgary", state: "AB", country: "CA", lat: 51.0447, lng: -114.0719 },
  { name: "Edmonton Journal", url: "https://edmontonjournal.com/", rss: "https://edmontonjournal.com/feed/", town: "Edmonton", state: "AB", country: "CA", lat: 53.5461, lng: -113.4938 },
  { name: "Red Deer Advocate", url: "https://www.reddeeradvocate.com/", rss: "https://www.reddeeradvocate.com/feed/", town: "Red Deer", state: "AB", country: "CA", lat: 52.2681, lng: -113.8112 },
  { name: "Lethbridge Herald", url: "https://lethbridgeherald.com/", rss: "https://lethbridgeherald.com/feed/", town: "Lethbridge", state: "AB", country: "CA", lat: 49.693, lng: -112.842 },
  { name: "Medicine Hat News", url: "https://medicinehatnews.com/", rss: "https://medicinehatnews.com/feed/", town: "Medicine Hat", state: "AB", country: "CA", lat: 50.0405, lng: -110.6766 },
  { name: "Daily Herald-Tribune", url: "https://www.dailyheraldtribune.com/", rss: "https://www.dailyheraldtribune.com/feed/", town: "Grande Prairie", state: "AB", country: "CA", lat: 55.1707, lng: -118.7884 },
  { name: "Fort McMurray Today", url: "https://www.fortmcmurraytoday.com/", rss: "https://www.fortmcmurraytoday.com/feed/", town: "Fort McMurray", state: "AB", country: "CA", lat: 56.726, lng: -111.38 },
  { name: "Hinton Parklander", url: "https://www.hintonparklander.com/", rss: "https://www.hintonparklander.com/feed/", town: "Hinton", state: "AB", country: "CA", lat: 53.4, lng: -117.583 },
  { name: "The Fitzhugh", url: "https://www.fitzhugh.ca/", rss: "https://www.fitzhugh.ca/feed/", town: "Jasper", state: "AB", country: "CA", lat: 52.8737, lng: -118.0814 },
  { name: "Rocky Mountain Outlook", url: "https://www.rmoutlook.com/", rss: "https://www.rmoutlook.com/feed/", town: "Canmore", state: "AB", country: "CA", lat: 51.089, lng: -115.361 },
  { name: "Crag & Canyon", url: "https://www.thecragandcanyon.ca/", rss: "https://www.thecragandcanyon.ca/feed/", town: "Banff", state: "AB", country: "CA", lat: 51.1784, lng: -115.5708 },
  { name: "Cochrane Eagle", url: "https://www.cochraneeagle.com/", rss: "https://www.cochraneeagle.com/feed/", town: "Cochrane", state: "AB", country: "CA", lat: 51.189, lng: -114.468 },
  { name: "Okotoks Western Wheel", url: "https://www.westernwheel.ca/", rss: "https://www.westernwheel.ca/feed/", town: "Okotoks", state: "AB", country: "CA", lat: 50.726, lng: -113.975 },
  { name: "High River Times", url: "https://www.highrivertimes.com/", rss: "https://www.highrivertimes.com/feed/", town: "High River", state: "AB", country: "CA", lat: 50.580, lng: -113.874 },
  { name: "St. Albert Gazette", url: "https://www.stalbertgazette.com/", rss: "https://www.stalbertgazette.com/feed/", town: "St. Albert", state: "AB", country: "CA", lat: 53.630, lng: -113.626 },
  { name: "Sherwood Park News", url: "https://www.sherwoodparknews.com/", rss: "https://www.sherwoodparknews.com/feed/", town: "Sherwood Park", state: "AB", country: "CA", lat: 53.541, lng: -113.294 },
  { name: "Peace River Record-Gazette", url: "https://www.prrecordgazette.com/", rss: "https://www.prrecordgazette.com/feed/", town: "Peace River", state: "AB", country: "CA", lat: 56.235, lng: -117.29 },
  { name: "Lakeside Leader", url: "https://www.lakesideleader.com/", rss: "https://www.lakesideleader.com/feed/", town: "Slave Lake", state: "AB", country: "CA", lat: 55.283, lng: -114.771 },
  { name: "Pincher Creek Echo", url: "https://www.pinchercreekecho.com/", rss: "https://www.pinchercreekecho.com/feed/", town: "Pincher Creek", state: "AB", country: "CA", lat: 49.486, lng: -113.95 },
  { name: "Crowsnest Pass Herald", url: "https://www.passherald.ca/", rss: "https://www.passherald.ca/feed/", town: "Blairmore", state: "AB", country: "CA", lat: 49.605, lng: -114.438 },
  { name: "Mountain View Gazette", url: "https://www.mountainviewgazette.ca/", rss: "https://www.mountainviewgazette.ca/feed/", town: "Olds", state: "AB", country: "CA", lat: 51.789, lng: -114.107 },
  { name: "The Albertan", url: "https://www.thealbertan.com/", rss: "https://www.thealbertan.com/feed/", town: "Olds", state: "AB", country: "CA", lat: 51.789, lng: -114.107 },
  { name: "Rocky Mountain House Mountaineer", url: "https://www.rmhmountaineer.com/", rss: "https://www.rmhmountaineer.com/feed/", town: "Rocky Mountain House", state: "AB", country: "CA", lat: 52.375, lng: -114.921 },

  // Saskatchewan
  { name: "Saskatoon StarPhoenix", url: "https://thestarphoenix.com/", rss: "https://thestarphoenix.com/feed/", town: "Saskatoon", state: "SK", country: "CA", lat: 52.1332, lng: -106.67 },
  { name: "Regina Leader-Post", url: "https://leaderpost.com/", rss: "https://leaderpost.com/feed/", town: "Regina", state: "SK", country: "CA", lat: 50.4452, lng: -104.6189 },
  { name: "Prince Albert Daily Herald", url: "https://paherald.sk.ca/", rss: "https://paherald.sk.ca/feed/", town: "Prince Albert", state: "SK", country: "CA", lat: 53.203, lng: -105.753 },
  { name: "Moose Jaw Today", url: "https://www.moosejawtoday.com/", rss: "https://www.moosejawtoday.com/feed/", town: "Moose Jaw", state: "SK", country: "CA", lat: 50.393, lng: -105.551 },
  { name: "Southwest Booster", url: "https://www.southwestbooster.ca/", rss: "https://www.southwestbooster.ca/feed/", town: "Swift Current", state: "SK", country: "CA", lat: 50.285, lng: -107.798 },
  { name: "Yorkton This Week", url: "https://www.yorktonthisweek.com/", rss: "https://www.yorktonthisweek.com/feed/", town: "Yorkton", state: "SK", country: "CA", lat: 51.214, lng: -102.463 },
  { name: "Battlefords News-Optimist", url: "https://www.newsoptimist.ca/", rss: "https://www.newsoptimist.ca/feed/", town: "North Battleford", state: "SK", country: "CA", lat: 52.758, lng: -108.286 },
  { name: "Northern Pride", url: "https://www.northernprideml.com/", rss: "https://www.northernprideml.com/feed/", town: "Meadow Lake", state: "SK", country: "CA", lat: 54.13, lng: -108.435 },
  { name: "La Ronge Northerner", url: "https://www.lronow.com/", rss: "https://www.lronow.com/feed/", town: "La Ronge", state: "SK", country: "CA", lat: 55.108, lng: -105.286 },

  // Manitoba
  { name: "Winnipeg Free Press", url: "https://www.winnipegfreepress.com/", rss: "https://www.winnipegfreepress.com/feed/", town: "Winnipeg", state: "MB", country: "CA", lat: 49.8954, lng: -97.1385 },
  { name: "Winnipeg Sun", url: "https://winnipegsun.com/", rss: "https://winnipegsun.com/feed/", town: "Winnipeg", state: "MB", country: "CA", lat: 49.8954, lng: -97.1385 },
  { name: "Brandon Sun", url: "https://www.brandonsun.com/", rss: "https://www.brandonsun.com/feed/", town: "Brandon", state: "MB", country: "CA", lat: 49.848, lng: -99.95 },
  { name: "Thompson Citizen", url: "https://www.thompsoncitizen.net/", rss: "https://www.thompsoncitizen.net/feed/", town: "Thompson", state: "MB", country: "CA", lat: 55.7433, lng: -97.8553 },
  { name: "The Reminder", url: "https://www.thereminder.ca/", rss: "https://www.thereminder.ca/feed/", town: "Flin Flon", state: "MB", country: "CA", lat: 54.768, lng: -101.875 },
  { name: "Opasquia Times", url: "https://www.opasquiatimes.com/", rss: "https://www.opasquiatimes.com/feed/", town: "The Pas", state: "MB", country: "CA", lat: 53.825, lng: -101.254 },
  { name: "The Carillon", url: "https://www.thecarillon.com/", rss: "https://www.thecarillon.com/feed/", town: "Steinbach", state: "MB", country: "CA", lat: 49.526, lng: -96.684 },
  { name: "Portage Daily Graphic", url: "https://www.portagedailygraphic.com/", rss: "https://www.portagedailygraphic.com/feed/", town: "Portage la Prairie", state: "MB", country: "CA", lat: 49.973, lng: -98.288 },
  { name: "Dauphin Herald", url: "https://www.dauphinherald.com/", rss: "https://www.dauphinherald.com/feed/", town: "Dauphin", state: "MB", country: "CA", lat: 51.149, lng: -100.05 },
  { name: "Selkirk Record", url: "https://www.selkirkrecord.ca/", rss: "https://www.selkirkrecord.ca/feed/", town: "Selkirk", state: "MB", country: "CA", lat: 50.1436, lng: -96.8845 },

  // Ontario North
  { name: "TBNewsWatch", url: "https://www.tbnewswatch.com/", rss: "https://www.tbnewswatch.com/feed/", town: "Thunder Bay", state: "ON", country: "CA", lat: 48.3809, lng: -89.2477, tier: "digital" },
  { name: "Chronicle-Journal", url: "https://www.chroniclejournal.com/", rss: "https://www.chroniclejournal.com/search/?f=rss", town: "Thunder Bay", state: "ON", country: "CA", lat: 48.3809, lng: -89.2477 },
  { name: "SooToday", url: "https://www.sootoday.com/", rss: "https://www.sootoday.com/rss", town: "Sault Ste. Marie", state: "ON", country: "CA", lat: 46.4953, lng: -84.3453, tier: "digital" },
  { name: "The Sault Star", url: "https://www.saultstar.com/", rss: "https://www.saultstar.com/feed/", town: "Sault Ste. Marie", state: "ON", country: "CA", lat: 46.4953, lng: -84.3453 },
  { name: "Sudbury.com", url: "https://www.sudbury.com/", rss: "https://www.sudbury.com/rss", town: "Sudbury", state: "ON", country: "CA", lat: 46.4917, lng: -80.993, tier: "digital" },
  { name: "The Sudbury Star", url: "https://www.thesudburystar.com/", rss: "https://www.thesudburystar.com/feed/", town: "Sudbury", state: "ON", country: "CA", lat: 46.4917, lng: -80.993 },
  { name: "TimminsToday", url: "https://www.timminstoday.com/", rss: "https://www.timminstoday.com/rss", town: "Timmins", state: "ON", country: "CA", lat: 48.476, lng: -81.33, tier: "digital" },
  { name: "Timmins Daily Press", url: "https://www.timminspress.com/", rss: "https://www.timminspress.com/feed/", town: "Timmins", state: "ON", country: "CA", lat: 48.476, lng: -81.33 },
  { name: "BayToday", url: "https://www.baytoday.ca/", rss: "https://www.baytoday.ca/rss", town: "North Bay", state: "ON", country: "CA", lat: 46.309, lng: -79.461, tier: "digital" },
  { name: "North Bay Nugget", url: "https://www.nugget.ca/", rss: "https://www.nugget.ca/feed/", town: "North Bay", state: "ON", country: "CA", lat: 46.309, lng: -79.461 },
  { name: "Kenora Online", url: "https://www.kenoraonline.com/", rss: "https://www.kenoraonline.com/feed/", town: "Kenora", state: "ON", country: "CA", lat: 49.767, lng: -94.49 },
  { name: "Kenora Miner and News", url: "https://www.kenoraminerandnews.com/", rss: "https://www.kenoraminerandnews.com/feed/", town: "Kenora", state: "ON", country: "CA", lat: 49.767, lng: -94.49 },
  { name: "Dryden Observer", url: "https://thedrydenobserver.ca/", rss: "https://thedrydenobserver.ca/feed/", town: "Dryden", state: "ON", country: "CA", lat: 49.78, lng: -92.837 },
  { name: "Fort Frances Times", url: "https://fftimes.com/", rss: "https://fftimes.com/feed/", town: "Fort Frances", state: "ON", country: "CA", lat: 48.609, lng: -93.403 },
  { name: "Sioux Lookout Bulletin", url: "https://www.siouxbulletin.com/", rss: "https://www.siouxbulletin.com/feed/", town: "Sioux Lookout", state: "ON", country: "CA", lat: 50.098, lng: -91.917 },
  { name: "Elliot Lake Standard", url: "https://www.elliotlakestandard.ca/", rss: "https://www.elliotlakestandard.ca/feed/", town: "Elliot Lake", state: "ON", country: "CA", lat: 46.386, lng: -82.651 },
  { name: "Manitoulin Expositor", url: "https://www.manitoulin.com/", rss: "https://www.manitoulin.com/feed/", town: "Little Current", state: "ON", country: "CA", lat: 45.98, lng: -81.927 },
  { name: "Parry Sound North Star", url: "https://www.parrysound.com/", rss: "https://www.parrysound.com/feed/", town: "Parry Sound", state: "ON", country: "CA", lat: 45.347, lng: -80.035 },
  { name: "Huntsville Forester", url: "https://www.muskokaregion.com/", rss: "https://www.muskokaregion.com/feed/", town: "Huntsville", state: "ON", country: "CA", lat: 45.327, lng: -79.217 },
  { name: "Algonquin Times", url: "https://algonquintimes.com/", rss: "https://algonquintimes.com/feed/", town: "Pembroke", state: "ON", country: "CA", lat: 45.827, lng: -77.111, tier: "digital" },
  { name: "Timmins Weekly", url: "https://www.timminsweekly.com/", rss: "https://www.timminsweekly.com/feed/", town: "Timmins", state: "ON", country: "CA", lat: 48.476, lng: -81.33 },
  { name: "Northern Ontario Business", url: "https://www.northernontariobusiness.com/", rss: "https://www.northernontariobusiness.com/rss/articles", town: "Sudbury", state: "ON", country: "CA", lat: 46.4917, lng: -80.993, tier: "digital" },
];

const AGENCIES: Row[] = [
  // State wildlife agencies (West + moose/bear range)
  { name: "Alaska Department of Fish and Game", url: "https://www.adfg.alaska.gov/", rss: "https://www.adfg.alaska.gov/index.cfm?adfg=pressreleases.rss", town: "Juneau", state: "AK", country: "US", lat: 58.3019, lng: -134.4197, tier: "agency" },
  { name: "Montana Fish, Wildlife & Parks", url: "https://fwp.mt.gov/", town: "Helena", state: "MT", country: "US", lat: 46.5891, lng: -112.0391, tier: "agency" },
  { name: "Wyoming Game and Fish Department", url: "https://wgfd.wyo.gov/", town: "Cheyenne", state: "WY", country: "US", lat: 41.14, lng: -104.8202, tier: "agency" },
  { name: "Idaho Fish and Game", url: "https://idfg.idaho.gov/", rss: "https://idfg.idaho.gov/press", town: "Boise", state: "ID", country: "US", lat: 43.615, lng: -116.2023, tier: "agency" },
  { name: "Colorado Parks and Wildlife", url: "https://cpw.state.co.us/", town: "Denver", state: "CO", country: "US", lat: 39.7392, lng: -104.9903, tier: "agency" },
  { name: "Washington Department of Fish and Wildlife", url: "https://wdfw.wa.gov/", rss: "https://wdfw.wa.gov/about/news", town: "Olympia", state: "WA", country: "US", lat: 47.0379, lng: -122.9007, tier: "agency" },
  { name: "Oregon Department of Fish and Wildlife", url: "https://www.dfw.state.or.us/", town: "Salem", state: "OR", country: "US", lat: 44.9429, lng: -123.0351, tier: "agency" },
  { name: "California Department of Fish and Wildlife", url: "https://wildlife.ca.gov/", rss: "https://wildlife.ca.gov/News", town: "Sacramento", state: "CA", country: "US", lat: 38.5816, lng: -121.4944, tier: "agency" },
  { name: "Arizona Game and Fish Department", url: "https://www.azgfd.com/", town: "Phoenix", state: "AZ", country: "US", lat: 33.4484, lng: -112.074, tier: "agency" },
  { name: "New Mexico Department of Game and Fish", url: "https://www.wildlife.state.nm.us/", town: "Santa Fe", state: "NM", country: "US", lat: 35.687, lng: -105.9378, tier: "agency" },
  { name: "Utah Division of Wildlife Resources", url: "https://wildlife.utah.gov/", town: "Salt Lake City", state: "UT", country: "US", lat: 40.7608, lng: -111.891, tier: "agency" },
  { name: "Nevada Department of Wildlife", url: "https://www.ndow.org/", rss: "https://www.ndow.org/blog/feed/", town: "Reno", state: "NV", country: "US", lat: 39.5296, lng: -119.8138, tier: "agency" },
  { name: "Maine Department of Inland Fisheries & Wildlife", url: "https://www.maine.gov/ifw/", town: "Augusta", state: "ME", country: "US", lat: 44.3106, lng: -69.7795, tier: "agency" },
  { name: "Minnesota Department of Natural Resources", url: "https://www.dnr.state.mn.us/", town: "St. Paul", state: "MN", country: "US", lat: 44.9537, lng: -93.09, tier: "agency" },
  { name: "Wisconsin Department of Natural Resources", url: "https://dnr.wisconsin.gov/", town: "Madison", state: "WI", country: "US", lat: 43.0731, lng: -89.4012, tier: "agency" },
  { name: "Michigan Department of Natural Resources", url: "https://www.michigan.gov/dnr", town: "Lansing", state: "MI", country: "US", lat: 42.7325, lng: -84.5555, tier: "agency" },
  { name: "New Hampshire Fish and Game", url: "https://www.wildlife.nh.gov/", town: "Concord", state: "NH", country: "US", lat: 43.2081, lng: -71.5376, tier: "agency" },
  { name: "Vermont Fish & Wildlife", url: "https://vtfishandwildlife.com/", rss: "https://vtfishandwildlife.com/news/rss.xml", town: "Montpelier", state: "VT", country: "US", lat: 44.2601, lng: -72.5754, tier: "agency" },
  { name: "New York State DEC", url: "https://dec.ny.gov/", town: "Albany", state: "NY", country: "US", lat: 42.6526, lng: -73.7562, tier: "agency" },
  { name: "Pennsylvania Game Commission", url: "https://www.pa.gov/agencies/pgc.html", town: "Harrisburg", state: "PA", country: "US", lat: 40.2732, lng: -76.8867, tier: "agency" },
  { name: "Tennessee Wildlife Resources Agency", url: "https://www.tn.gov/twra.html", town: "Nashville", state: "TN", country: "US", lat: 36.1627, lng: -86.7816, tier: "agency" },
  { name: "Florida Fish and Wildlife Conservation Commission", url: "https://myfwc.com/", rss: "https://myfwc.com/news/rss/", town: "Tallahassee", state: "FL", country: "US", lat: 30.4383, lng: -84.2807, tier: "agency" },
  { name: "Texas Parks and Wildlife Department", url: "https://tpwd.texas.gov/", town: "Austin", state: "TX", country: "US", lat: 30.2672, lng: -97.7431, tier: "agency" },
  { name: "North Carolina Wildlife Resources Commission", url: "https://www.ncwildlife.org/", town: "Raleigh", state: "NC", country: "US", lat: 35.7796, lng: -78.6382, tier: "agency" },
  { name: "Virginia Department of Wildlife Resources", url: "https://dwr.virginia.gov/", town: "Richmond", state: "VA", country: "US", lat: 37.5407, lng: -77.436, tier: "agency" },
  { name: "West Virginia DNR", url: "https://wvdnr.gov/", town: "Charleston", state: "WV", country: "US", lat: 38.3498, lng: -81.6326, tier: "agency" },
  { name: "South Dakota Game, Fish and Parks", url: "https://gfp.sd.gov/", town: "Pierre", state: "SD", country: "US", lat: 44.3683, lng: -100.351, tier: "agency" },
  { name: "North Dakota Game and Fish", url: "https://gf.nd.gov/", town: "Bismarck", state: "ND", country: "US", lat: 46.8083, lng: -100.7837, tier: "agency" },

  // NPS — synthetic domains so each park can have its own feed
  { name: "NPS — Yellowstone National Park", url: "https://www.nps.gov/yell/learn/news/index.htm", town: "Yellowstone", state: "WY", country: "US", lat: 44.428, lng: -110.5885, tier: "agency", domain: "nps.gov/yell", notes: "Park press / visitor safety" },
  { name: "NPS — Glacier National Park", url: "https://www.nps.gov/glac/learn/news/index.htm", town: "West Glacier", state: "MT", country: "US", lat: 48.5, lng: -113.98, tier: "agency", domain: "nps.gov/glac" },
  { name: "NPS — Grand Teton National Park", url: "https://www.nps.gov/grte/learn/news/index.htm", town: "Moose", state: "WY", country: "US", lat: 43.7904, lng: -110.6818, tier: "agency", domain: "nps.gov/grte" },
  { name: "NPS — Rocky Mountain National Park", url: "https://www.nps.gov/romo/learn/news/index.htm", town: "Estes Park", state: "CO", country: "US", lat: 40.3428, lng: -105.6836, tier: "agency", domain: "nps.gov/romo" },
  { name: "NPS — Yosemite National Park", url: "https://www.nps.gov/yose/learn/news/index.htm", town: "Yosemite", state: "CA", country: "US", lat: 37.8651, lng: -119.5383, tier: "agency", domain: "nps.gov/yose" },
  { name: "NPS — Sequoia & Kings Canyon", url: "https://www.nps.gov/seki/learn/news/index.htm", town: "Sequoia", state: "CA", country: "US", lat: 36.4864, lng: -118.5658, tier: "agency", domain: "nps.gov/seki" },
  { name: "NPS — Denali National Park", url: "https://www.nps.gov/dena/learn/news/index.htm", town: "Denali", state: "AK", country: "US", lat: 63.1148, lng: -151.1926, tier: "agency", domain: "nps.gov/dena" },
  { name: "NPS — Katmai National Park", url: "https://www.nps.gov/katm/learn/news/index.htm", town: "King Salmon", state: "AK", country: "US", lat: 58.5975, lng: -154.6939, tier: "agency", domain: "nps.gov/katm" },
  { name: "NPS — Olympic National Park", url: "https://www.nps.gov/olym/learn/news/index.htm", town: "Port Angeles", state: "WA", country: "US", lat: 48.1181, lng: -123.4307, tier: "agency", domain: "nps.gov/olym" },
  { name: "NPS — North Cascades National Park", url: "https://www.nps.gov/noca/learn/news/index.htm", town: "Sedro-Woolley", state: "WA", country: "US", lat: 48.504, lng: -122.236, tier: "agency", domain: "nps.gov/noca" },
  { name: "NPS — Great Smoky Mountains", url: "https://www.nps.gov/grsm/learn/news/index.htm", town: "Gatlinburg", state: "TN", country: "US", lat: 35.7143, lng: -83.5102, tier: "agency", domain: "nps.gov/grsm" },
  { name: "NPS — Grand Canyon National Park", url: "https://www.nps.gov/grca/learn/news/index.htm", town: "Grand Canyon", state: "AZ", country: "US", lat: 36.1069, lng: -112.1129, tier: "agency", domain: "nps.gov/grca" },
  { name: "NPS national news", url: "https://www.nps.gov/aboutus/news/news-releases.htm", town: "Washington", state: "DC", country: "US", lat: 38.9072, lng: -77.0369, tier: "agency", domain: "nps.gov/news" },

  // Canadian ministries / parks
  { name: "Parks Canada news", url: "https://www.pc.gc.ca/en/agence-agency/media", town: "Ottawa", state: "ON", country: "CA", lat: 45.4215, lng: -75.6972, tier: "agency", domain: "pc.gc.ca/news" },
  { name: "BC Conservation Officer Service / WLRS news", url: "https://news.gov.bc.ca/ministries/water-land-and-resource-stewardship", rss: "https://news.gov.bc.ca/ministries/water-land-and-resource-stewardship.rss", town: "Victoria", state: "BC", country: "CA", lat: 48.4284, lng: -123.3656, tier: "agency", domain: "news.gov.bc.ca/wlrs" },
  { name: "Government of Alberta news", url: "https://www.alberta.ca/news", town: "Edmonton", state: "AB", country: "CA", lat: 53.5461, lng: -113.4938, tier: "agency", domain: "alberta.ca/news" },
  { name: "Ontario newsroom", url: "https://news.ontario.ca/en", town: "Toronto", state: "ON", country: "CA", lat: 43.6532, lng: -79.3832, tier: "agency", domain: "news.ontario.ca" },
  { name: "Yukon government news", url: "https://yukon.ca/en/news", town: "Whitehorse", state: "YT", country: "CA", lat: 60.7212, lng: -135.0568, tier: "agency", domain: "yukon.ca/news" },
  { name: "NWT Environment and Climate Change", url: "https://www.gov.nt.ca/en/newsroom", town: "Yellowknife", state: "NT", country: "CA", lat: 62.454, lng: -114.3718, tier: "agency", domain: "gov.nt.ca/news" },
  { name: "Manitoba Sustainable Development news", url: "https://news.gov.mb.ca/", town: "Winnipeg", state: "MB", country: "CA", lat: 49.8954, lng: -97.1385, tier: "agency", domain: "news.gov.mb.ca" },
  { name: "Saskatchewan Environment news", url: "https://www.saskatchewan.ca/government/news-and-media", town: "Regina", state: "SK", country: "CA", lat: 50.4452, lng: -104.6189, tier: "agency", domain: "saskatchewan.ca/news" },
];

function writeList(rel: string, rows: Row[]) {
  const seeds = rows.map(toSeed).filter((s): s is PublicationSeed => Boolean(s));
  const seen = new Set<string>();
  const unique = seeds.filter((s) => {
    if (seen.has(s.domain)) return false;
    seen.add(s.domain);
    return true;
  });
  const dest = path.join(ROOT, rel);
  fs.writeFileSync(dest, `${JSON.stringify(unique, null, 2)}\n`);
  console.log(`Wrote ${unique.length} → ${rel}`);
  return unique.length;
}

const ca = writeList("data/publications/canada-local-news.json", CANADA);
const ag = writeList("data/publications/agency-feeds.json", AGENCIES);
console.log(JSON.stringify({ canada: ca, agencies: ag }, null, 2));
