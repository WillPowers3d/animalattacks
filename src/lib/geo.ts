/** Deterministic lat/lng for known places; falls back to admin-area centroids. */

type Coord = { lat: number; lng: number };

const STATE_CENTROIDS: Record<string, Coord> = {
  AL: { lat: 32.806671, lng: -86.79113 },
  AK: { lat: 63.588753, lng: -154.493062 },
  AZ: { lat: 34.048928, lng: -111.093731 },
  AR: { lat: 35.20105, lng: -91.831833 },
  CA: { lat: 36.778259, lng: -119.417931 },
  CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 },
  DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 19.898682, lng: -155.665857 },
  ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 },
  IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.5266, lng: -96.726486 },
  KY: { lat: 37.66814, lng: -84.670067 },
  LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 },
  MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 },
  MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 },
  MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.12537, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 },
  NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 },
  NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 },
  OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 },
  PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.51178 },
  SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 },
  TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 },
  UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 },
  WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 },
  WY: { lat: 42.755966, lng: -107.30249 },
};

const PLACE_COORDS: Record<string, Coord> = {
  "anchorage,ak": { lat: 61.2181, lng: -149.9003 },
  "fairbanks,ak": { lat: 64.8378, lng: -147.7164 },
  "juneau,ak": { lat: 58.3019, lng: -134.4197 },
  "kodiak,ak": { lat: 57.79, lng: -152.4072 },
  "sitka,ak": { lat: 57.0531, lng: -135.33 },
  "seward,ak": { lat: 60.1042, lng: -149.4422 },
  "homer,ak": { lat: 59.6425, lng: -151.5483 },
  "nome,ak": { lat: 64.5011, lng: -165.4064 },
  "sterling,ak": { lat: 60.5375, lng: -150.7647 },
  "eagle river,ak": { lat: 61.3214, lng: -149.5678 },
  "glennallen,ak": { lat: 62.1094, lng: -145.5464 },
  "healy,ak": { lat: 63.867, lng: -149.015 },
  "kenai,ak": { lat: 60.5544, lng: -151.2583 },
  "cordova,ak": { lat: 60.5428, lng: -145.7575 },
  "cold bay,ak": { lat: 55.1858, lng: -162.7211 },
  "columbia falls,mt": { lat: 48.3725, lng: -114.1815 },
  "great falls,mt": { lat: 47.5053, lng: -111.3008 },
  "west yellowstone,mt": { lat: 44.6622, lng: -111.1043 },
  "big sky,mt": { lat: 45.2847, lng: -111.3683 },
  "bozeman,mt": { lat: 45.677, lng: -111.0429 },
  "choteau,mt": { lat: 47.8125, lng: -112.1836 },
  "ennis,mt": { lat: 45.3488, lng: -111.7297 },
  "kalispell,mt": { lat: 48.1958, lng: -114.316 },
  "island park,id": { lat: 44.4944, lng: -111.3374 },
  "jackson,wy": { lat: 43.4799, lng: -110.7624 },
  "cody,wy": { lat: 44.5263, lng: -109.0565 },
  "pinedale,wy": { lat: 42.8666, lng: -109.8607 },
  "meeteetse,wy": { lat: 44.1572, lng: -108.8718 },
  "cora,wy": { lat: 43.0591, lng: -110.016 },
  "dubois,wy": { lat: 43.5336, lng: -109.6307 },
  "estes park,co": { lat: 40.3772, lng: -105.5217 },
  "steamboat springs,co": { lat: 40.485, lng: -106.8317 },
  "winter park,co": { lat: 39.8917, lng: -105.7631 },
  "great falls,mt ": { lat: 47.5053, lng: -111.3008 },
  "south lake tahoe,ca": { lat: 38.9399, lng: -119.9772 },
  "silver city,nm": { lat: 32.77, lng: -108.274 },
  "ocate,nm": { lat: 36.175, lng: -105.048 },
  "gatlinburg,tn": { lat: 35.7143, lng: -83.5102 },
  "sevierville,tn": { lat: 35.8681, lng: -83.5619 },
  "bristol,nh": { lat: 43.5912, lng: -71.7367 },
  "rangeley,me": { lat: 44.9648, lng: -70.6428 },
  "zanesville,oh": { lat: 39.9403, lng: -82.0132 },
  "greenwood lake,ny": { lat: 41.2226, lng: -74.2943 },
  "marion county,fl": { lat: 29.212, lng: -82.058 },
  "ft. walton beach,fl": { lat: 30.4058, lng: -86.6188 },
  "sanford,fl": { lat: 28.8029, lng: -81.2695 },
  "new castle,co": { lat: 39.5725, lng: -107.5364 },
  "castle pines,co": { lat: 39.458, lng: -104.896 },
  "north bend,wa": { lat: 47.4957, lng: -121.7868 },
  "georgetown,ca": { lat: 38.9068, lng: -120.8386 },
  "auburn,ca": { lat: 38.8966, lng: -121.0769 },
  "banff,ab": { lat: 51.1784, lng: -115.5708 },
  "jasper,ab": { lat: 52.8737, lng: -118.0814 },
  "selkirk,mb": { lat: 50.1436, lng: -96.8845 },
  "dawson city,yt": { lat: 64.0601, lng: -139.4328 },
  "churchill,mb": { lat: 58.7684, lng: -94.165 },
  "longyearbyen,no": { lat: 78.2232, lng: 15.6267 },
  "svalbard,no": { lat: 78.2232, lng: 15.6267 },
  "kassel,de": { lat: 51.3127, lng: 9.4797 },
  "yellowstone,wy": { lat: 44.428, lng: -110.5885 },
  "glacier national park,mt": { lat: 48.696, lng: -113.718 },
  "denali,ak": { lat: 63.1148, lng: -151.1926 },
  "katmai,ak": { lat: 58.5975, lng: -154.6939 },
  "russian river,ak": { lat: 60.486, lng: -149.946 },
  "gravelly mountains,mt": { lat: 44.95, lng: -111.83 },
  "tom miner basin,mt": { lat: 45.15, lng: -111.05 },
  "cabinet mountains,mt": { lat: 48.23, lng: -115.7 },
  "becharof,ak": { lat: 57.95, lng: -156.4 },
  "wrangell,ak": { lat: 61.4, lng: -142.9 },
  "henrys lake,id": { lat: 44.616, lng: -111.386 },
  "upper green river,wy": { lat: 43.2, lng: -110.0 },
  "hidden lakes,mt": { lat: 45.28, lng: -111.25 },
  "siren,wi": { lat: 45.7858, lng: -92.381 },
  "kingston,ma": { lat: 41.992, lng: -70.7248 },
  "luther,mt": { lat: 45.3, lng: -109.4 },
  "bell flats,ak": { lat: 57.71, lng: -152.51 },
  "chichagof,ak": { lat: 57.9, lng: -135.6 },
  "chitina,ak": { lat: 61.5158, lng: -144.4369 },
  "byers lake,ak": { lat: 62.743, lng: -150.12 },
  "keweenaw,mi": { lat: 47.4, lng: -88.2 },
  "kachemak,ak": { lat: 59.6, lng: -151.3 },
  "boundary waters,mn": { lat: 48.1, lng: -91.0 },
  "madison range,mt": { lat: 45.15, lng: -111.45 },
  "mount hood,or": { lat: 45.3736, lng: -121.6959 },
  "el dorado county,ca": { lat: 38.7783, lng: -120.524 },
  "santa monica mountains,ca": { lat: 34.12, lng: -118.85 },
  "orange county,ca": { lat: 33.7175, lng: -117.8311 },
  "boulder,co": { lat: 40.015, lng: -105.2705 },
  "vancouver,bc": { lat: 49.2827, lng: -123.1207 },
  "whistler,bc": { lat: 50.1163, lng: -122.9574 },
  "canmore,ab": { lat: 51.089, lng: -115.361 },
  "whitehorse,yt": { lat: 60.7212, lng: -135.0568 },
  "yellowknife,nt": { lat: 62.454, lng: -114.3718 },
  "red deer,ab": { lat: 52.2681, lng: -113.8112 },
  "garden lake,on": { lat: 50.85, lng: -91.7 },
  "glide,or": { lat: 43.3001, lng: -123.1012 },
  "walla walla,wa": { lat: 46.0646, lng: -118.343 },
  "pocono,pa": { lat: 41.1, lng: -75.3 },
  "live oak canyon,ca": { lat: 33.9, lng: -117.65 },
  "rockrimmon,co": { lat: 38.92, lng: -104.83 },
  "petit lake,wa": { lat: 48.7, lng: -117.35 },
  "yellow jacket,ca": { lat: 38.55, lng: -122.6 },
  "nevada city,nv": { lat: 39.2616, lng: -121.0161 },
  "nevada city,ca": { lat: 39.2616, lng: -121.0161 },
  "muldoon,ak": { lat: 61.205, lng: -149.74 },
  "mantakusa,ak": { lat: 61.2, lng: -147.5 },
  "afognak,ak": { lat: 58.3, lng: -152.5 },
  "unuk river,ak": { lat: 56.2, lng: -130.9 },
  "skykomish,wa": { lat: 47.71, lng: -121.36 },
  "clark,wy": { lat: 44.9, lng: -109.15 },
  "circle lake,ak": { lat: 65.8, lng: -144.1 },
  "minto,ak": { lat: 65.147, lng: -149.37 },
  "chickaloon,ak": { lat: 61.796, lng: -148.466 },
  "highland valley,bc": { lat: 50.48, lng: -121.02 },
  "kootenay,bc": { lat: 50.6, lng: -116.0 },
  "central,ak": { lat: 65.572, lng: -144.803 },
  "rodgersville,mo": { lat: 37.1167, lng: -93.0557 },
  "bachelor gulch,co": { lat: 39.605, lng: -106.516 },
  "ponderosa,az": { lat: 34.23, lng: -111.3 },
  "cherokee national forest,tn": { lat: 36.1, lng: -82.1 },
  "grays harbor,wa": { lat: 47.05, lng: -123.85 },
  "north pole expedition,no": { lat: 78.2, lng: 15.6 },
  "talkeetna,ak": { lat: 62.3209, lng: -150.1066 },
  "lander,wy": { lat: 42.833, lng: -108.7307 },
  "bondurant,wy": { lat: 43.205, lng: -110.405 },
  "two oceans pass,wy": { lat: 44.05, lng: -110.15 },
  "baranof,ak": { lat: 57.1, lng: -134.85 },
  "chena,ak": { lat: 64.9, lng: -146.4 },
  "pioneer trail,ca": { lat: 38.9, lng: -119.97 },
  "eldridge creek,mt": { lat: 45.05, lng: -111.35 },
  "stamp meadows,id": { lat: 44.45, lng: -111.4 },
  "resurrection trail,ak": { lat: 60.48, lng: -149.75 },
  "featherly creek,ak": { lat: 57.85, lng: -156.35 },
  "wolf creek,mt": { lat: 47.0, lng: -112.07 },
  "flathead,mt": { lat: 48.4, lng: -114.1 },
  "caribou-targhee,id": { lat: 44.5, lng: -111.35 },
  "tepee creek,mt": { lat: 44.85, lng: -111.15 },
  "gallatin,mt": { lat: 45.4, lng: -111.15 },
  "seattle,wa": { lat: 47.6062, lng: -122.3321 },
  "kenai peninsula,ak": { lat: 60.3, lng: -150.5 },
  "wind river,wy": { lat: 43.2, lng: -109.5 },
  "stewart island,ak": { lat: 55.23, lng: -131.98 },
  "stokes state forest,nj": { lat: 41.18, lng: -74.83 },
  "seneca lake,az": { lat: 34.33, lng: -111.3 },
  "talkeetna mountains,ak": { lat: 62.0, lng: -148.5 },
  "western talkeetna mountains,ak": { lat: 62.0, lng: -148.5 },
  "ishawooa mesa,wy": { lat: 44.35, lng: -109.55 },
  "lake mary,ca": { lat: 37.605, lng: -119.0 },
  "bruin creek,wy": { lat: 44.7, lng: -109.4 },
  "north crandall,wy": { lat: 44.85, lng: -109.7 },
  "north crandall,": { lat: 44.85, lng: -109.7 },
  "pocono country place,pa": { lat: 41.17, lng: -75.32 },
  "las vegas,nm": { lat: 35.594, lng: -105.223 },
  "shoshone river,wy": { lat: 44.52, lng: -109.05 },
  "gallatin county,mt": { lat: 45.54, lng: -111.17 },
  "fort collins,co": { lat: 40.5853, lng: -105.0844 },
  "olympia,wa": { lat: 47.0379, lng: -122.9007 },
  "breckenridge,co": { lat: 39.4817, lng: -106.0384 },
  "walden,co": { lat: 40.7316, lng: -106.2836 },
  "collier county,fl": { lat: 26.15, lng: -81.6 },
  "boston bar,bc": { lat: 49.868, lng: -121.443 },
  "walker,la": { lat: 30.488, lng: -90.861 },
  "grand teton,wy": { lat: 43.7904, lng: -110.6818 },
  "grand teton national park,wy": { lat: 43.7904, lng: -110.6818 },
  "mammoth hot springs,wy": { lat: 44.976, lng: -110.701 },
  "rocky mountain national park,co": { lat: 40.3428, lng: -105.6836 },
  "horsetooth,co": { lat: 40.54, lng: -105.16 },
  "whiting ranch,ca": { lat: 33.68, lng: -117.65 },
  "lake forest,ca": { lat: 33.6469, lng: -117.6892 },
  "capitol state forest,wa": { lat: 46.95, lng: -123.15 },
  "capitol forest,wa": { lat: 46.95, lng: -123.15 },
  "scapegoat,mt": { lat: 47.25, lng: -112.7 },
  "ear mountain,mt": { lat: 47.82, lng: -112.7 },
  "coal creek,mt": { lat: 45.2, lng: -110.9 },
  "montreal river,mi": { lat: 47.4, lng: -88.15 },
  "calumet,mi": { lat: 47.246, lng: -88.453 },
  "parks highway,ak": { lat: 62.74, lng: -150.12 },
  "kodiak island,ak": { lat: 57.47, lng: -153.4 },
  "chichagof island,ak": { lat: 57.9, lng: -135.6 },
  "becharof wildlife refuge,ak": { lat: 57.95, lng: -156.4 },
  "cootenays mountains,bc": { lat: 50.6, lng: -116.0 },
  "kootenays,bc": { lat: 50.6, lng: -116.0 },
  "afognak island,ak": { lat: 58.3, lng: -152.5 },
  "afogak island,ak": { lat: 58.3, lng: -152.5 },
  "svalbard,sv": { lat: 78.2232, lng: 15.6267 },
  "morrow county,oh": { lat: 40.53, lng: -82.79 },
  "morrow county ohio,oh": { lat: 40.53, lng: -82.79 },
  "tsiu river,ak": { lat: 60.09, lng: -143.7 },
  "chickaloon river,ak": { lat: 61.8, lng: -148.45 },
  "grays harbor county,wa": { lat: 47.05, lng: -123.85 },
  "keweenaw county,mi": { lat: 47.4, lng: -88.2 },
  "summit county,co": { lat: 39.59, lng: -106.11 },
  "larimer county,co": { lat: 40.7, lng: -105.5 },
  "park county,wy": { lat: 44.52, lng: -109.6 },
  "pinyon ridge,wy": { lat: 42.87, lng: -109.86 },
  "shedhorn ridge,mt": { lat: 45.2, lng: -111.5 },
  "pass creek,wy": { lat: 44.4, lng: -109.3 },
  "benchmark,mt": { lat: 47.48, lng: -112.9 },
  "yukon river,yt": { lat: 64.0, lng: -139.4 },
  "snake river,wy": { lat: 43.66, lng: -110.72 },
  "state forest state park,co": { lat: 40.54, lng: -106.0 },
  "north park,co": { lat: 40.75, lng: -106.3 },
  "hunchback mountain,or": { lat: 45.3, lng: -121.73 },
  "bow valley,ab": { lat: 51.1, lng: -115.35 },
  "fraser canyon,bc": { lat: 49.87, lng: -121.44 },
  "wasilla,ak": { lat: 61.5814, lng: -149.4394 },
  "palmer,ak": { lat: 61.5996, lng: -149.1128 },
  "soldotna,ak": { lat: 60.4878, lng: -151.0583 },
  "valdez,ak": { lat: 61.1308, lng: -146.3483 },
  "bethel,ak": { lat: 60.7922, lng: -161.7558 },
  "dillingham,ak": { lat: 59.0397, lng: -158.4575 },
  "ketchikan,ak": { lat: 55.3422, lng: -131.6461 },
  "skagway,ak": { lat: 59.4583, lng: -135.3139 },
  "hattiesburg,ms": { lat: 31.3271, lng: -89.2903 },
  "missoula,mt": { lat: 46.8721, lng: -113.994 },
  "whitefish,mt": { lat: 48.4111, lng: -114.3376 },
  "livingston,mt": { lat: 45.6624, lng: -110.561 },
  "red lodge,mt": { lat: 45.1858, lng: -109.2468 },
  "gardiner,mt": { lat: 45.0319, lng: -110.7058 },
  "cooke city,mt": { lat: 45.02, lng: -109.934 },
  "seeley lake,mt": { lat: 47.1794, lng: -113.4845 },
  "hamilton,mt": { lat: 46.2466, lng: -114.1603 },
  "libby,mt": { lat: 48.3883, lng: -115.556 },
  "troy,mt": { lat: 48.4633, lng: -115.891 },
  "lincoln,mt": { lat: 46.9549, lng: -112.6817 },
  "augusta,mt": { lat: 47.4916, lng: -112.392 },
  "drummond,mt": { lat: 46.6674, lng: -113.147 },
  "phillipsburg,mt": { lat: 46.3324, lng: -113.2942 },
  "salmon,id": { lat: 45.1758, lng: -113.8959 },
  "driggs,id": { lat: 43.7232, lng: -111.1113 },
  "victor,id": { lat: 43.6027, lng: -111.1113 },
  "rexburg,id": { lat: 43.823, lng: -111.7897 },
  "idaho falls,id": { lat: 43.4917, lng: -112.033 },
  "coeur d'alene,id": { lat: 47.6777, lng: -116.7805 },
  "sandpoint,id": { lat: 48.2766, lng: -116.5532 },
  "mccall,id": { lat: 44.911, lng: -116.0985 },
  "stanley,id": { lat: 44.216, lng: -114.937 },
  "jackson hole,wy": { lat: 43.4799, lng: -110.7624 },
  "wilson,wy": { lat: 43.5008, lng: -110.877 },
  "alpine,wy": { lat: 43.1638, lng: -111.0177 },
  "afton,wy": { lat: 42.725, lng: -110.9319 },
  "laramie,wy": { lat: 41.3114, lng: -105.5911 },
  "sheridan,wy": { lat: 44.797, lng: -106.9562 },
  "aspen,co": { lat: 39.1911, lng: -106.8175 },
  "vail,co": { lat: 39.6403, lng: -106.3742 },
  "durango,co": { lat: 37.2753, lng: -107.8801 },
  "pagosa springs,co": { lat: 37.2694, lng: -107.0098 },
  "grand junction,co": { lat: 39.0639, lng: -108.5506 },
  "fort walton beach,fl": { lat: 30.4058, lng: -86.6188 },
  "ocala,fl": { lat: 29.1872, lng: -82.1401 },
  "lake placid,ny": { lat: 44.2795, lng: -73.9799 },
  "lake george,ny": { lat: 43.4262, lng: -73.7123 },
  "adirondack,ny": { lat: 44.1, lng: -74.0 },
  "bangor,me": { lat: 44.8016, lng: -68.7712 },
  "bar harbor,me": { lat: 44.3876, lng: -68.2039 },
  "bend,or": { lat: 44.0582, lng: -121.3153 },
  "bend,or ": { lat: 44.0582, lng: -121.3153 },
  "grants pass,or": { lat: 42.439, lng: -123.3284 },
  "medford,or": { lat: 42.3265, lng: -122.8756 },
  "eugene,or": { lat: 44.0521, lng: -123.0868 },
  "spokane,wa": { lat: 47.6588, lng: -117.426 },
  "leavenworth,wa": { lat: 47.5962, lng: -120.6615 },
  "port angeles,wa": { lat: 48.1181, lng: -123.4307 },
  "flagstaff,az": { lat: 35.1983, lng: -111.6513 },
  "prescott,az": { lat: 34.5403, lng: -112.4685 },
  "payson,az": { lat: 34.2309, lng: -111.3251 },
  "taos,nm": { lat: 36.4072, lng: -105.5731 },
  "santa fe,nm": { lat: 35.687, lng: -105.9378 },
  "moab,ut": { lat: 38.5733, lng: -109.5498 },
  "park city,ut": { lat: 40.6461, lng: -111.498 },
  "reno,nv": { lat: 39.5296, lng: -119.8138 },
  "south lake tahoe,nv": { lat: 38.9399, lng: -119.9772 },
  "mammoth lakes,ca": { lat: 37.6485, lng: -118.9721 },
  "yosemite,ca": { lat: 37.8651, lng: -119.5383 },
  "sequoia,ca": { lat: 36.4864, lng: -118.5658 },
  "big sur,ca": { lat: 36.2704, lng: -121.8081 },
  "trinity,ca": { lat: 40.78, lng: -123.0 },
  "eureka,ca": { lat: 40.8021, lng: -124.1637 },
  "redding,ca": { lat: 40.5865, lng: -122.3917 },
  "kelowna,bc": { lat: 49.888, lng: -119.496 },
  "kamloops,bc": { lat: 50.6745, lng: -120.3273 },
  "prince george,bc": { lat: 53.9171, lng: -122.7497 },
  "revelstoke,bc": { lat: 50.9981, lng: -118.1957 },
  "golden,bc": { lat: 51.296, lng: -116.963 },
  "fernie,bc": { lat: 49.504, lng: -115.063 },
  "cranbrook,bc": { lat: 49.512, lng: -115.769 },
  "invermere,bc": { lat: 50.505, lng: -116.03 },
  "squamish,bc": { lat: 49.7016, lng: -123.1558 },
  "pemberton,bc": { lat: 50.321, lng: -122.805 },
  "calgary,ab": { lat: 51.0447, lng: -114.0719 },
  "edmonton,ab": { lat: 53.5461, lng: -113.4938 },
  "hinton,ab": { lat: 53.4, lng: -117.583 },
  "grande prairie,ab": { lat: 55.1707, lng: -118.7884 },
  "thunder bay,on": { lat: 48.3809, lng: -89.2477 },
  "sault ste marie,on": { lat: 46.4953, lng: -84.3453 },
  "sudbury,on": { lat: 46.4917, lng: -80.993 },
  "algonquin,on": { lat: 45.84, lng: -78.38 },
  "thompson,mb": { lat: 55.7433, lng: -97.8553 },
  "winnipeg,mb": { lat: 49.8954, lng: -97.1385 },
  "dawson,yt": { lat: 64.0601, lng: -139.4328 },
  "inuvik,nt": { lat: 68.3607, lng: -133.723 },
  "iqaluit,nu": { lat: 63.7467, lng: -68.517 },
  "gatineau,qc": { lat: 45.4765, lng: -75.7013 },
  "montreal,qc": { lat: 45.5017, lng: -73.5673 },
  "quebec city,qc": { lat: 46.8139, lng: -71.208 },
};

const PROVINCE_CENTROIDS: Record<string, Coord> = {
  AB: { lat: 53.9333, lng: -116.5765 },
  BC: { lat: 53.7267, lng: -127.6476 },
  MB: { lat: 53.7609, lng: -98.8139 },
  NB: { lat: 46.5653, lng: -66.4619 },
  NL: { lat: 53.1355, lng: -57.6604 },
  NS: { lat: 44.682, lng: -63.7443 },
  NT: { lat: 64.8255, lng: -124.8457 },
  NU: { lat: 70.2998, lng: -83.1076 },
  ON: { lat: 51.2538, lng: -85.3232 },
  PE: { lat: 46.5107, lng: -63.4168 },
  QC: { lat: 52.9399, lng: -73.5491 },
  SK: { lat: 52.9399, lng: -106.4509 },
  YT: { lat: 64.2823, lng: -135.0 },
};

const COUNTRY_CENTROIDS: Record<string, Coord> = {
  US: { lat: 39.8283, lng: -98.5795 },
  CA: { lat: 56.1304, lng: -106.3468 },
  MX: { lat: 23.6345, lng: -102.5528 },
  NO: { lat: 78.2232, lng: 15.6267 },
  DE: { lat: 51.1657, lng: 10.4515 },
  RU: { lat: 61.524, lng: 105.3188 },
  OTHER: { lat: 45, lng: -100 },
};

export type GeocodePrecision = "city" | "state" | "country";

export type GeocodeResult = Coord & {
  precision: GeocodePrecision;
  matched?: string;
};

const PLACE_ALIASES: Record<string, string> = {
  "kodiak island": "kodiak",
  "chichagof island": "chichagof",
  afogak: "afognak",
  "afogak island": "afognak",
  "afognak island": "afognak",
  glacier: "glacier national park",
  "becharof wildlife refuge": "becharof",
  "island park reservoir": "island park",
  "kenai peninsula": "kenai peninsula",
  "pocono country place": "pocono",
  "ft walton beach": "ft. walton beach",
  "fort walton beach": "ft. walton beach",
  "cootenays mountains": "kootenay",
  kootenays: "kootenay",
  "jackson hole": "jackson",
  "grand teton national park": "grand teton",
  "capitol forest": "capitol state forest",
  "whiting ranch wilderness park": "whiting ranch",
  "rocky mountain np": "rocky mountain national park",
  "mammoth": "mammoth hot springs",
  "yellowstone national park": "yellowstone",
  "denali national park": "denali",
  svalbard: "svalbard",
  spitsbergen: "svalbard",
  "longyearbyen": "longyearbyen",
};

const STATE_NAME_CITIES = new Set([
  "alaska", "alabama", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
  "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west virginia", "wisconsin", "wyoming",
  "british columbia", "alberta", "manitoba", "ontario", "yukon", "quebec",
  "saskatchewan", "nunavut", "canada", "united states", "mexico", "norway",
  "russia", "germany",
]);

function key(city?: string | null, state?: string | null) {
  return `${(city ?? "").toLowerCase().trim()},${(state ?? "").toLowerCase().trim()}`;
}

function stripPlaceNoise(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(
      /\b(wildlife refuge|national forest|national park|caribou-?targhee|developed area|townsite|greenbelt|open space)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function lookupPlace(city: string, state?: string | null): { coord: Coord; matched: string } | null {
  const alias = PLACE_ALIASES[city.toLowerCase()] ?? city;
  const variants = [alias, stripPlaceNoise(alias), city, stripPlaceNoise(city)].filter(Boolean);
  const stateKey = (state ?? "").toLowerCase().trim();

  for (const v of variants) {
    const exact = key(v, state);
    if (PLACE_COORDS[exact]) return { coord: PLACE_COORDS[exact], matched: exact };
  }
  for (const v of variants) {
    const prefix = `${v.toLowerCase().trim()},`;
    const hit = Object.entries(PLACE_COORDS).find(([place]) => place.startsWith(prefix));
    if (hit) return { coord: hit[1], matched: hit[0] };
  }
  if (stateKey) {
    for (const v of variants) {
      const token = v.toLowerCase().trim();
      if (token.length < 4) continue;
      const hit = Object.entries(PLACE_COORDS).find(([place]) => {
        const [pCity, pState] = place.split(",");
        return pState === stateKey && (pCity.includes(token) || token.includes(pCity));
      });
      if (hit) return { coord: hit[1], matched: hit[0] };
    }
  }
  return null;
}

export function resolveGeocode(input: {
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country?: string | null;
}): GeocodeResult {
  const rawCity = (input.city ?? "").trim();
  const rawRegion = (input.region ?? "").trim();
  const state = input.stateProvince ?? null;
  const cityIsAdmin = STATE_NAME_CITIES.has(rawCity.toLowerCase());
  const regionIsAdmin = STATE_NAME_CITIES.has(rawRegion.toLowerCase());

  const candidates = [cityIsAdmin ? "" : rawCity, regionIsAdmin ? "" : rawRegion].filter(Boolean);
  for (const cand of candidates) {
    const hit = lookupPlace(cand, state);
    if (hit) return { ...hit.coord, precision: "city", matched: hit.matched };
  }

  if (state && STATE_CENTROIDS[state]) {
    return { ...STATE_CENTROIDS[state], precision: "state", matched: state };
  }
  if (state && PROVINCE_CENTROIDS[state]) {
    return { ...PROVINCE_CENTROIDS[state], precision: "state", matched: state };
  }
  if (state === "SV" || input.country === "NO") {
    return { ...PLACE_COORDS["svalbard,no"], precision: "city", matched: "svalbard,no" };
  }
  const country = COUNTRY_CENTROIDS[input.country ?? "US"] ?? COUNTRY_CENTROIDS.US;
  return { ...country, precision: "country", matched: input.country ?? "US" };
}

export function geocodeIncident(input: {
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country?: string | null;
}): Coord {
  const resolved = resolveGeocode(input);
  return { lat: resolved.lat, lng: resolved.lng };
}

export function isMappablePrecision(precision: GeocodePrecision) {
  return precision === "city" || precision === "state";
}

/** Small deterministic offset so stacked state-centroid points fan out. */
export function offsetCoord(coord: Coord, salt: string): Coord {
  let hash = 0;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  const a = ((hash % 1000) / 1000 - 0.5) * 1.4;
  const b = (((hash >> 10) % 1000) / 1000 - 0.5) * 1.4;
  return { lat: coord.lat + a, lng: coord.lng + b };
}
