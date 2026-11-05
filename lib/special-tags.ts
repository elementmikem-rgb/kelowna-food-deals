// What a special is about, separate from WHEN it runs. specials.category answers "when / what kind of
// event" (happy hour, wing night, ...) and holds one value, so half-priced wings under Wing Night never
// showed under Food, and beer under Other never showed as a drink. Tags answer "what is it" and can
// stack: wings are food AND wings, a "wings and a pint" deal is food, wings, drink and beer.
// Pure keyword rules, no AI: tagSpecial() runs when a special is saved and over the existing rows once.

export const SPECIAL_TAGS = ["food", "drink", "wings", "beer", "wine", "cocktails", "activity", "kids", "brunch"] as const;
export type SpecialTag = (typeof SPECIAL_TAGS)[number];

// \b does not treat accented letters as word characters, so words are matched between non-letters.
const w = (words: string[]) => new RegExp(`(?:^|[^a-zà-ÿ])(?:${words.join("|")})(?![a-zà-ÿ])`, "i");

const WINGS = w(["wings?", "ailes?"]);
// "bottle" alone is not here on purpose: "bottles of wine" is wine and "bottles of Corona" has a brand.
const BEER = w([
  "beers?", "bières?", "pints?", "pitchers?", "pichets?", "drafts?", "draughts?", "lagers?", "ales?", "ipas?", "pilsners?",
  "stouts?", "ciders?", "cidres?", "tall ?boys?", "sleeves?", "jugs?", "towers?", "growlers?", "kegs?", "stubbies",
  "corona", "bud light", "budweiser", "coors", "molson", "labatt", "kokanee", "pbr", "heineken", "stella", "guinness",
  "white claw", "seltzers?", "coolers?", "olé", "tankards?", "steins?", "domestic bottles?", "domestics?", "blue moon",
]);
const WINE = w([
  "wines?", "vins?", "prosecco", "sparkling", "champagne", "bubbly", "rosé", "merlot", "pinot", "chardonnay",
  "sauvignon", "cabernet", "riesling", "house (?:red|white)",
]);
const COCKTAILS = w([
  "caesars?", "césars?", "margaritas?", "margs?", "mimosas?", "cocktails?", "martinis?", "negroni", "highballs?", "shooters?",
  "shots?", "shafts?", "spritz", "mules?", "sangria", "mojitos?", "old fashioned", "manhattan", "paloma", "daiquiri",
  "bellini", "aperol", "spirits?", "liquor", "whisky", "whiskey", "vodka", "gin", "rum", "tequila", "bourbon", "rye",
  "scotch", "bloody marys?", "sours?", "bellinis?", "fireball", "bevies", "bevy", "mocktails?",
]);
const OTHER_DRINK = w(["drinks?", "boissons?", "coffee", "espresso", "latte", "kombucha", "soda", "red bull", "pop", "juice"]);
const FOOD = w([
  "nachos?", "fries", "poutines?", "burgers?", "pizzas?", "tacos?", "sandwich(?:es)?", "sliders?", "pierogi", "pierogies", "sushi",
  "rolls?", "salads?", "soups?", "steaks?", "ribs?", "fish", "chips", "pasta", "dips?", "appetizers?", "apps?", "platters?",
  "curry", "bowls?", "lunch", "dinner", "breakfast", "menu", "prix fixe", "eat free", "combos?", "wraps?", "quesadillas?",
  "calamari", "mozza", "cheese", "dumplings?", "pho", "ramen", "noodles?", "oysters?", "mussels", "prawns?", "shrimp",
  "garlic bread", "dessert", "cake", "pie", "ice cream", "waffles?", "pancakes?", "benny", "afternoon tea", "tapas",
  "charcuterie", "flatbreads?", "hot dogs?", "pretzels?", "bao", "entrées?", "meal", "chicken", "pork", "beef", "pulled pork",
  "brisket", "sashimi", "tartare", "tataki", "poke", "snacks?", "bites", "skewers?", "falafel", "shawarma", "gyros?",
  "burritos?", "enchiladas?", "ceviche", "croissants?", "bagels?", "brunch", "take-?out", "food", "appies", "eats", "tots?", "perogies", "spaghetti", "bolognese", "ribz", "table d'hôte",
]);
const ACTIVITY = w([
  "bowling", "lanes?", "golf", "billiards?", "billard", "pool", "karaoke", "all you can sing", "trivia", "arcade", "gaming",
  "axe throwing", "darts?", "escape room", "spa", "day pass", "movies?", "cinema", "curling", "skating", "skiing",
  "lift tickets?", "laser tag", "birthday party", "night's stay", "nights? stay",
]);
const KIDS = w(["kids?", "children", "enfants?", "junior"]);
const BRUNCH = w(["brunch", "breakfast", "déjeuner"]);

export interface TaggableSpecial {
  title: string;
  description?: string | null;
  category?: string | null;
}

const fromText = (text: string): Set<SpecialTag> => {
  const t = new Set<SpecialTag>();
  if (WINGS.test(text)) { t.add("wings"); t.add("food"); }
  if (BEER.test(text)) t.add("beer");
  if (WINE.test(text)) t.add("wine");
  if (COCKTAILS.test(text)) t.add("cocktails");
  if (FOOD.test(text)) t.add("food");
  if (ACTIVITY.test(text)) t.add("activity");
  if (KIDS.test(text)) t.add("kids");
  if (BRUNCH.test(text)) t.add("brunch");
  return t;
};

// The title is the strong signal. The description is only used when the title says nothing,
// because descriptions drift ("Happy hour food special" on a $2 wine).
export function tagSpecial(s: TaggableSpecial): SpecialTag[] {
  let tags = fromText(s.title);
  if (tags.size === 0 && s.description) {
    tags = fromText(s.description);
    // A description often lists a whole menu ("appies: wings, nachos"), so it can say food or drink but not wings or kids.
    tags.delete("wings");
    tags.delete("kids");
  }

  if (tags.has("beer") || tags.has("wine") || tags.has("cocktails")) tags.add("drink");
  if (!tags.has("drink") && OTHER_DRINK.test(s.title)) tags.add("drink");

  // Fall back to the venue-level label when the words say nothing.
  if (!tags.has("food") && !tags.has("drink") && !tags.has("activity")) {
    if (s.category === "food_special" || s.category === "food") tags.add("food");
    else if (s.category === "wing_night") { tags.add("food"); tags.add("wings"); }
    else if (s.category === "drink") tags.add("drink");
  }
  return SPECIAL_TAGS.filter((t) => tags.has(t));
}
