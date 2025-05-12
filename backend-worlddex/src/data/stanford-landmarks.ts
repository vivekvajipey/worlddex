export interface StanfordLandmark {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  radius: number; // in meters
  silhouette_key?: string;
  thumb_key?: string;
  collection_rarity: "common" | "uncommon" | "rare" | "legendary";
  is_secret_rare: boolean;
}

export const STANFORD_LANDMARKS: StanfordLandmark[] = [
  // Existing landmarks - updated IDs to match images
  {
    id: "claw-fountain",
    name: "The Claw (White Memorial Fountain)",
    description: "A popular meeting spot and refreshing place to cool off on hot days.",
    coordinates: { lat: 37.425148859146304, lng: -122.16927807280942 },
    radius: 100,
    silhouette_key: "claw-fountain-silhouette.jpg",
    thumb_key: "claw-fountain-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "hoover-tower",
    name: "Hoover Tower",
    description: "The iconic 285-foot tower that offers panoramic views of the Stanford campus and beyond.",
    coordinates: { lat: 37.427467, lng: -122.166962 },
    radius: 300,
    silhouette_key: "hoover-tower-silhouette.jpg",
    thumb_key: "hoover-tower-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "memorial-church",
    name: "Memorial Church",
    description: "This beautiful non-denominational church stands at the center of campus and features stunning mosaics and stained glass.",
    coordinates: { lat: 37.426751, lng: -122.170054 },
    radius: 200,
    silhouette_key: "memorial-church-silhouette.jpg",
    thumb_key: "memorial-church-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "cantor-museum",
    name: "Cantor Arts Center",
    description: "Stanford's premier art museum featuring diverse collections from ancient to contemporary works.",
    coordinates: { lat: 37.430919, lng: -122.167281 },
    radius: 150,
    silhouette_key: "cantor-museum-silhouette.jpg",
    thumb_key: "cantor-museum-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "main-quad",
    name: "Main Quad",
    description: "The historic center of Stanford's campus with its beautiful sandstone arcades.",
    coordinates: { lat: 37.427238, lng: -122.169438 },
    radius: 200,
    silhouette_key: "main-quad-silhouette.jpg",
    thumb_key: "main-quad-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "green-library",
    name: "Green Library",
    description: "Stanford's main library housing millions of books and resources.",
    coordinates: { lat: 37.426933, lng: -122.165844 },
    radius: 150,
    silhouette_key: "green-library-silhouette.jpg",
    thumb_key: "green-library-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  
  // New/Updated landmarks
  {
    id: "nvidia-auditorium",
    name: "NVIDIA Auditorium",
    description: "Modern lecture hall within the Jen-Hsun Huang Engineering Center.",
    coordinates: { lat: 37.429398, lng: -122.173250 },
    radius: 150,
    silhouette_key: "nvidia-auditorium-silhouette.jpg",
    thumb_key: "nvidia-auditorium-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "the-oval",
    name: "The Oval",
    description: "The iconic entrance to Stanford University featuring a grassy oval surrounded by palm trees.",
    coordinates: { lat: 37.429327, lng: -122.169902 },
    radius: 200,
    silhouette_key: "the-oval-silhouette.jpg",
    thumb_key: "the-oval-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "palm-drive",
    name: "Palm Drive",
    description: "The picturesque main entrance to Stanford lined with majestic palm trees.",
    coordinates: { lat: 37.427829, lng: -122.168718 },
    radius: 300,
    silhouette_key: "palm-drive-silhouette.jpg",
    thumb_key: "palm-drive-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "palm-tree",
    name: "Stanford Palm Trees",
    description: "The iconic palm trees that line many of Stanford's pathways and plazas.",
    coordinates: { lat: 37.427829, lng: -122.168718 }, // Using Palm Drive coordinates as default
    radius: 500, // Large radius since palm trees are throughout campus
    silhouette_key: "palm-tree-silhouette.jpg",
    thumb_key: "palm-tree-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "dish-satellite",
    name: "The Dish Satellite",
    description: "The radio telescope that gives the popular hiking area its name.",
    coordinates: { lat: 37.407830, lng: -122.181312 },
    radius: 400,
    silhouette_key: "dish-satellite-silhouette.jpg",
    thumb_key: "dish-satellite-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "dish-turkey",
    name: "Dish Trail Turkeys",
    description: "The wild turkeys that roam the hills around The Dish hiking trail.",
    coordinates: { lat: 37.407830, lng: -122.181312 }, // Same coordinates as The Dish
    radius: 400,
    silhouette_key: "dish-turkey-silhouette.jpg",
    thumb_key: "dish-turkey-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "engineering-quad-planets",
    name: "Engineering Quad Planets",
    description: "Scale models of the planets throughout the Engineering Quad.",
    coordinates: { lat: 37.428879, lng: -122.173183 },
    radius: 180,
    silhouette_key: "engineering-planets-silhouette.jpg",
    thumb_key: "engineering-planets-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "rodin-sculptures",
    name: "Rodin Sculpture Garden",
    description: "Outdoor garden showcasing Rodin's bronze sculptures, including The Thinker.",
    coordinates: { lat: 37.431553, lng: -122.169815 },
    radius: 150,
    silhouette_key: "rodin-sculptures-silhouette.jpg",
    thumb_key: "rodin-sculptures-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "lake-lag",
    name: "Lake Lagunita",
    description: "A seasonal lake on Stanford's campus that's now primarily a recreational area.",
    coordinates: { lat: 37.423882, lng: -122.175302 },
    radius: 300,
    silhouette_key: "lake-lag-silhouette.jpg",
    thumb_key: "lake-lag-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "bike-racks",
    name: "Stanford Bike Racks",
    description: "The distinctive bike racks found throughout Stanford's campus, used by thousands of students daily.",
    coordinates: { lat: 37.427238, lng: -122.169438 }, // Main Quad coordinates as default
    radius: 500, // Large radius since bike racks are throughout campus
    silhouette_key: "bike-racks-silhouette.jpg",
    thumb_key: "bike-racks-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "plaza-piano",
    name: "White Plaza Piano",
    description: "The outdoor piano in White Plaza where students can spontaneously play music.",
    coordinates: { lat: 37.424375, lng: -122.169574 },
    radius: 100,
    silhouette_key: "plaza-piano-silhouette.jpg",
    thumb_key: "plaza-piano-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "stone-sphere",
    name: "Stone Sphere Fountain",
    description: "The floating granite sphere water feature found on campus that can be rotated by hand despite weighing tons.",
    coordinates: { lat: 37.429062, lng: -122.173497 },
    radius: 100,
    silhouette_key: "stone-sphere-silhouette.jpg",
    thumb_key: "stone-sphere-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "stanford-stadium",
    name: "Stanford Stadium",
    description: "The university's football stadium with a capacity of over 50,000.",
    coordinates: { lat: 37.434587, lng: -122.160914 },
    radius: 350,
    silhouette_key: "stanford-stadium-silhouette.jpg",
    thumb_key: "stanford-stadium-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "bing-concert-hall",
    name: "Bing Concert Hall",
    description: "Stanford's premier concert venue known for its exceptional acoustics.",
    coordinates: { lat: 37.432647, lng: -122.165749 },
    radius: 150,
    silhouette_key: "bing-concert-hall-silhouette.jpg",
    thumb_key: "bing-concert-hall-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  },
  {
    id: "tresidder-union",
    name: "Tresidder Union",
    description: "The student union building housing dining, services, and meeting spaces.",
    coordinates: { lat: 37.424058, lng: -122.170515 },
    radius: 150,
    silhouette_key: "tresidder-union-silhouette.jpg",
    thumb_key: "tresidder-union-thumb.jpg",
    collection_rarity: "common",
    is_secret_rare: false
  },
  {
    id: "fruit-trees",
    name: "Fruit Trees",
    description: "The beautiful fruit trees found throughout campus.",
    coordinates: { lat: 37.424450, lng: -122.170515 },
    radius: 500, // Larger radius since trees are spread out
    silhouette_key: "fruit-trees-silhouette.jpg",
    thumb_key: "fruit-trees-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "stanford-law-school",
    name: "Stanford Law School",
    description: "One of the world's leading law schools, known for its cutting-edge research and teaching.",
    coordinates: { lat: 37.423778, lng: -122.169187 },
    radius: 200,
    silhouette_key: "stanford-law-school-silhouette.jpg",
    thumb_key: "stanford-law-school-thumb.jpg",
    collection_rarity: "uncommon",
    is_secret_rare: false
  },
  {
    id: "angel-of-grief",
    name: "Angel of Grief",
    description: "A replica of the original by William Wetmore Story, commemorating Jane Stanford's brother.",
    coordinates: { lat: 37.433870, lng: -122.166634 },
    radius: 100,
    silhouette_key: "angel-of-grief-silhouette.jpg",
    thumb_key: "angel-of-grief-thumb.jpg",
    collection_rarity: "rare",
    is_secret_rare: false
  }
  // Add more landmarks as needed to reach 50
];

// Helper function to get a map of landmark IDs to their GPS coordinates
export function getLandmarkCoordinates(): Record<string, { lat: number; lng: number }> {
  return Object.fromEntries(
    STANFORD_LANDMARKS.map(landmark => [landmark.id, landmark.coordinates])
  );
}

// Stanford collection definition
export const STANFORD_COLLECTION = {
  name: "Stanford 50",
  description: "Discover 50 iconic landmarks and hidden gems across Stanford University's beautiful campus!",
  cover_photo_key: "stanford-collection-cover.jpg" // Upload this separately
}; 