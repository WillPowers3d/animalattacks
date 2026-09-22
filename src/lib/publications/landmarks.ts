/**
 * Well-known wildlife places that reprint wires mis-pin to the publishing paper's town.
 * Apply before falling back to Publication.state (e.g. Akron, CO reprinting Glacier NP).
 */
export type LandmarkPlace = {
  city: string;
  stateProvince: string;
  country: "US" | "CA" | "MX";
};

const LANDMARKS: [RegExp, LandmarkPlace][] = [
  [/Glacier(?:\s+National(?:\s+Park)?|\s+NP)\b/i, { city: "Glacier", stateProvince: "MT", country: "US" }],
  [/Yellowstone(?:\s+National(?:\s+Park)?)?\b/i, { city: "Yellowstone", stateProvince: "WY", country: "US" }],
  [/Grand Teton(?:s|\s+National(?:\s+Park)?)?\b/i, { city: "Jackson", stateProvince: "WY", country: "US" }],
  [/Rocky Mountain(?:\s+National(?:\s+Park)?|\s+NP)\b/i, { city: "Estes Park", stateProvince: "CO", country: "US" }],
  [/\bEstes Park\b/i, { city: "Estes Park", stateProvince: "CO", country: "US" }],
  [/\bSteamboat Springs\b/i, { city: "Steamboat Springs", stateProvince: "CO", country: "US" }],
  [/\bTelluride\b/i, { city: "Telluride", stateProvince: "CO", country: "US" }],
  [/\bDenali(?:\s+National(?:\s+Park)?)?\b/i, { city: "Denali", stateProvince: "AK", country: "US" }],
  [/\bKatmai(?:\s+National(?:\s+Park)?)?\b/i, { city: "Katmai", stateProvince: "AK", country: "US" }],
  [/\bYosemite(?:\s+National(?:\s+Park)?)?\b/i, { city: "Yosemite", stateProvince: "CA", country: "US" }],
  [/\bOlympic National(?:\s+Park)?\b/i, { city: "Port Angeles", stateProvince: "WA", country: "US" }],
  [/\b(?:Mount |Mt\.?\s+)?Rainier(?:\s+National(?:\s+Park)?)?\b/i, { city: "Ashford", stateProvince: "WA", country: "US" }],
  [/\bBanff(?:\s+National(?:\s+Park)?)?\b/i, { city: "Banff", stateProvince: "AB", country: "CA" }],
  [/\bJasper(?:\s+National(?:\s+Park)?)?\b/i, { city: "Jasper", stateProvince: "AB", country: "CA" }],
  [/\bWaterton(?:\s+Lakes(?:\s+National(?:\s+Park)?)?)?\b/i, { city: "Waterton", stateProvince: "AB", country: "CA" }],
  [/\bWhistler\b/i, { city: "Whistler", stateProvince: "BC", country: "CA" }],
  [/\bCanmore\b/i, { city: "Canmore", stateProvince: "AB", country: "CA" }],
  [/\bOvando\b/i, { city: "Ovando", stateProvince: "MT", country: "US" }],
  [/\bBig Sky\b/i, { city: "Big Sky", stateProvince: "MT", country: "US" }],
  [/\bWest Yellowstone\b/i, { city: "West Yellowstone", stateProvince: "MT", country: "US" }],
  [/\bBozeman\b/i, { city: "Bozeman", stateProvince: "MT", country: "US" }],
  [/\bAnchorage\b/i, { city: "Anchorage", stateProvince: "AK", country: "US" }],
  [/\bFairbanks\b/i, { city: "Fairbanks", stateProvince: "AK", country: "US" }],
  [/\bHomer\b/i, { city: "Homer", stateProvince: "AK", country: "US" }],
  [/\bPrince Albert(?:\s+National(?:\s+Park)?)?\b/i, { city: "Prince Albert", stateProvince: "SK", country: "CA" }],
];

export function inferLandmarkPlace(text: string): LandmarkPlace | null {
  for (const [re, place] of LANDMARKS) {
    if (re.test(text)) return place;
  }
  return null;
}
