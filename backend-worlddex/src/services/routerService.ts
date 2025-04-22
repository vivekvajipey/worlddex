const LIFE_WORDS = ["tree","plant","flower","bird","animal","mammal"];
export function gpsInStanford(gps?: {lat:number;lng:number}|null) {
  if (!gps) return false;
  return gps.lat > 37.41 && gps.lat < 37.44 && gps.lng < -122.15 && gps.lng > -122.18;
}

export function decideTier2(
  tier1Label: string | null,
  collections: string[] = [],
  gps?: { lat:number; lng:number } | null
) {
  if (!tier1Label) return { run:false };

  if (collections.includes("Organisms") && LIFE_WORDS.some(w=>tier1Label.includes(w)))
    return { run:true, module:"species" };

  if (collections.includes("Stanford") && gpsInStanford(gps))
    return { run:true, module:"landmark" };

  return { run:false };
}