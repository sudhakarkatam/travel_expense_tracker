// Destination-based packing templates
export interface DestinationTemplate {
  destination: string;
  country?: string;
  icon: string;
  items: Array<{ name: string; category: string }>;
}

export interface ActivityTemplate {
  destination: string;
  country?: string;
  icon: string;
  activities: Array<{ description: string; date?: string }>;
}

// Packing templates organized by destination/country
export const DESTINATION_PACKING_TEMPLATES: DestinationTemplate[] = [
  // India
  {
    destination: "India 🇮🇳",
    country: "India",
    icon: "flag",
    items: [
      { name: "Passport with visa 🛂", category: "Documents" },
      { name: "Indian SIM card 📱", category: "Electronics" },
      { name: "Power adapter (Type D) 🔌", category: "Electronics" },
      { name: "Mosquito repellent 🦟", category: "Health" },
      { name: "Hand sanitizer 🧴", category: "Health" },
      { name: "Wet wipes 🧻", category: "Toiletries" },
      { name: "Tissues 🤧", category: "Toiletries" },
      { name: "Comfortable walking shoes 👟", category: "Clothes" },
      { name: "Light cotton clothes 👕", category: "Clothes" },
      { name: "Sunscreen SPF 50+ ☀️", category: "Health" },
      { name: "Hat/Cap 🧢", category: "Accessories" },
      { name: "Reusable water bottle 💧", category: "Essentials" },
    ],
  },
  {
    destination: "Delhi 🕌",
    country: "India",
    icon: "location",
    items: [
      { name: "Comfortable walking shoes 👟", category: "Clothes" },
      { name: "Light jacket 🧥", category: "Clothes" },
      { name: "Camera 📷", category: "Electronics" },
      { name: "Cash (many places don't accept cards) 💵", category: "Essentials" },
    ],
  },
  {
    destination: "Mumbai 🏙️",
    country: "India",
    icon: "location",
    items: [
      { name: "Umbrella ☔", category: "Essentials" },
      { name: "Light rain jacket 🧥", category: "Clothes" },
      { name: "Comfortable shoes for walking 👟", category: "Clothes" },
    ],
  },
  {
    destination: "Goa 🏖️",
    country: "India",
    icon: "location",
    items: [
      { name: "Swimwear 👙", category: "Clothes" },
      { name: "Beach towel 🧖‍♀️", category: "Essentials" },
      { name: "Sunscreen SPF 50+ ☀️", category: "Health" },
      { name: "Sunglasses 🕶️", category: "Accessories" },
      { name: "Flip flops 🩴", category: "Clothes" },
      { name: "Beach bag 👜", category: "Accessories" },
    ],
  },
  // Europe
  {
    destination: "Europe 🇪🇺",
    country: "Europe",
    icon: "flag",
    items: [
      { name: "Passport 🛂", category: "Documents" },
      { name: "EU power adapter 🔌", category: "Electronics" },
      { name: "Travel insurance card 🏥", category: "Documents" },
      { name: "Comfortable walking shoes 👟", category: "Clothes" },
      { name: "Layers (sweater, jacket) 🧥", category: "Clothes" },
      { name: "Universal travel adapter 🔌", category: "Electronics" },
      { name: "Cash (Euros) 💶", category: "Essentials" },
      { name: "Credit card (chip & PIN) 💳", category: "Essentials" },
    ],
  },
  {
    destination: "Paris 🗼",
    country: "France",
    icon: "location",
    items: [
      { name: "Comfortable walking shoes 👟", category: "Clothes" },
      { name: "Umbrella ☔", category: "Essentials" },
      { name: "Light jacket 🧥", category: "Clothes" },
      { name: "Camera 📷", category: "Electronics" },
    ],
  },
  {
    destination: "London 🇬🇧",
    country: "UK",
    icon: "location",
    items: [
      { name: "Umbrella ☔", category: "Essentials" },
      { name: "Warm layers 🧣", category: "Clothes" },
      { name: "UK power adapter 🔌", category: "Electronics" },
      { name: "Oyster card or contactless card 💳", category: "Essentials" },
    ],
  },
  // USA
  {
    destination: "USA 🇺🇸",
    country: "USA",
    icon: "flag",
    items: [
      { name: "Passport 🛂", category: "Documents" },
      { name: "ESTA/Visa 📄", category: "Documents" },
      { name: "US power adapter 🔌", category: "Electronics" },
      { name: "Travel insurance 🏥", category: "Documents" },
      { name: "Credit cards 💳", category: "Essentials" },
      { name: "Driver's license (if renting car) 🚗", category: "Documents" },
    ],
  },
  {
    destination: "New York 🗽",
    country: "USA",
    icon: "location",
    items: [
      { name: "Comfortable walking shoes 👟", category: "Clothes" },
      { name: "Layers (weather changes quickly) 🧥", category: "Clothes" },
      { name: "MetroCard 🚇", category: "Essentials" },
      { name: "Camera 📷", category: "Electronics" },
    ],
  },
  // Beach destinations
  {
    destination: "Beach/Tropical 🌴",
    country: "General",
    icon: "sunny",
    items: [
      { name: "Swimwear 👙", category: "Clothes" },
      { name: "Beach towel 🧖‍♀️", category: "Essentials" },
      { name: "Sunscreen SPF 30+ ☀️", category: "Health" },
      { name: "Sunglasses 🕶️", category: "Accessories" },
      { name: "Flip flops 🩴", category: "Clothes" },
      { name: "Beach bag 👜", category: "Accessories" },
      { name: "Hat/Cap 🧢", category: "Accessories" },
      { name: "Cover-up 👗", category: "Clothes" },
      { name: "Waterproof phone case 📱", category: "Electronics" },
    ],
  },
  // Mountain destinations
  {
    destination: "Mountain/Hill 🏔️",
    country: "General",
    icon: "location-outline",
    items: [
      { name: "Warm layers 🧥", category: "Clothes" },
      { name: "Hiking boots 🥾", category: "Clothes" },
      { name: "Jacket 🧥", category: "Clothes" },
      { name: "Gloves 🧤", category: "Accessories" },
      { name: "Hat 🧢", category: "Accessories" },
      { name: "Thermal wear 🌡️", category: "Clothes" },
      { name: "First aid kit 🩹", category: "Health" },
      { name: "Water bottle 💧", category: "Essentials" },
      { name: "Backpack 🎒", category: "Accessories" },
    ],
  },
  // Business travel
  {
    destination: "Business 💼",
    country: "General",
    icon: "briefcase",
    items: [
      { name: "Business attire 👔", category: "Clothes" },
      { name: "Laptop 💻", category: "Electronics" },
      { name: "Charger 🔌", category: "Electronics" },
      { name: "Business cards 📇", category: "Essentials" },
      { name: "Formal shoes 👞", category: "Clothes" },
      { name: "Travel adapter 🔌", category: "Electronics" },
      { name: "Portfolio/Briefcase 💼", category: "Essentials" },
    ],
  },
];

// Activity templates organized by destination
export const DESTINATION_ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // India
  {
    destination: "Delhi 🕌",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Red Fort 🏰", date: "" },
      { description: "Explore India Gate 🇮🇳", date: "" },
      { description: "See Qutub Minar 🗼", date: "" },
      { description: "Visit Lotus Temple 🪷", date: "" },
      { description: "Shop at Chandni Chowk 🛍️", date: "" },
      { description: "Visit Humayun's Tomb 🏛️", date: "" },
    ],
  },
  {
    destination: "Mumbai 🏙️",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Gateway of India 🏛️", date: "" },
      { description: "Walk along Marine Drive 🌊", date: "" },
      { description: "Explore Elephanta Caves 🗿", date: "" },
      { description: "Visit Chhatrapati Shivaji Terminus 🚉", date: "" },
      { description: "Try street food at Juhu Beach 🍛", date: "" },
      { description: "Visit Bollywood studios 🎬", date: "" },
    ],
  },
  {
    destination: "Goa 🏖️",
    country: "India",
    icon: "location",
    activities: [
      { description: "Relax at Calangute Beach 🏖️", date: "" },
      { description: "Visit Fort Aguada 🏰", date: "" },
      { description: "Explore Spice Plantations 🌶️", date: "" },
      { description: "See Basilica of Bom Jesus ⛪", date: "" },
      { description: "Enjoy water sports 🏄‍♂️", date: "" },
      { description: "Visit Old Goa churches ⛪", date: "" },
    ],
  },
  {
    destination: "Rajasthan 🐪",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Jaipur Palace 🏰", date: "" },
      { description: "Explore Udaipur Lake 🛶", date: "" },
      { description: "See Jaisalmer Fort 🏰", date: "" },
      { description: "Visit Jodhpur Blue City 🏙️", date: "" },
      { description: "Experience camel safari 🐪", date: "" },
      { description: "Watch traditional dance 💃", date: "" },
    ],
  },
  {
    destination: "Kerala 🥥",
    country: "India",
    icon: "location",
    activities: [
      { description: "Backwaters houseboat tour 🚤", date: "" },
      { description: "Visit tea gardens in Munnar 🍵", date: "" },
      { description: "Relax at Varkala Beach 🏖️", date: "" },
      { description: "Explore Periyar Wildlife Sanctuary 🐘", date: "" },
      { description: "Watch Kathakali performance 🎭", date: "" },
      { description: "Try Ayurvedic spa 💆‍♀️", date: "" },
    ],
  },
  // Europe
  {
    destination: "Paris 🗼",
    country: "France",
    icon: "location",
    activities: [
      { description: "Visit Eiffel Tower 🗼", date: "" },
      { description: "Explore Louvre Museum 🖼️", date: "" },
      { description: "Walk along Champs-Élysées 🛍️", date: "" },
      { description: "Visit Notre-Dame ⛪", date: "" },
      { description: "Enjoy French cuisine 🥐", date: "" },
    ],
  },
  {
    destination: "London 🇬🇧",
    country: "UK",
    icon: "location",
    activities: [
      { description: "Visit Big Ben 🕰️", date: "" },
      { description: "Explore British Museum 🏛️", date: "" },
      { description: "See Tower Bridge 🌉", date: "" },
      { description: "Visit Buckingham Palace 👑", date: "" },
      { description: "Ride the London Eye 🎡", date: "" },
    ],
  },
  // USA
  {
    destination: "New York 🗽",
    country: "USA",
    icon: "location",
    activities: [
      { description: "Visit Statue of Liberty 🗽", date: "" },
      { description: "Walk in Central Park 🌳", date: "" },
      { description: "See Times Square 🏙️", date: "" },
      { description: "Visit Empire State Building 🏢", date: "" },
      { description: "Explore Brooklyn Bridge 🌉", date: "" },
    ],
  },
  // Top Places in India
  {
    destination: "Taj Mahal (Agra) 🕌",
    country: "India",
    icon: "location",
    activities: [
      { description: "Sunrise view of Taj Mahal 🌅", date: "" },
      { description: "Visit Agra Fort 🏰", date: "" },
      { description: "Explore Mehtab Bagh 🌳", date: "" },
      { description: "Try Petha (local sweet) 🍬", date: "" },
      { description: "Visit Fatehpur Sikri 🏛️", date: "" },
    ],
  },
  {
    destination: "Varanasi 🕉️",
    country: "India",
    icon: "location",
    activities: [
      { description: "Attend Ganga Aarti at Dashashwamedh Ghat 🔥", date: "" },
      { description: "Morning boat ride on Ganges 🛶", date: "" },
      { description: "Visit Kashi Vishwanath Temple 🛕", date: "" },
      { description: "Explore Sarnath 🏛️", date: "" },
      { description: "Walk through the narrow alleys 🚶", date: "" },
    ],
  },
  {
    destination: "Jaipur 🩷",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Amber Fort 🏰", date: "" },
      { description: "See Hawa Mahal 🌬️", date: "" },
      { description: "Explore City Palace 👑", date: "" },
      { description: "Visit Jantar Mantar 🔭", date: "" },
      { description: "Shop at Johari Bazaar 💍", date: "" },
    ],
  },
  {
    destination: "Ladakh 🏔️",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Pangong Lake 🏞️", date: "" },
      { description: "Explore Nubra Valley 🐪", date: "" },
      { description: "Visit Thiksey Monastery 🛕", date: "" },
      { description: "Drive on Magnetic Hill 🚗", date: "" },
      { description: "Visit Shanti Stupa 🕊️", date: "" },
    ],
  },
  {
    destination: "Hampi 🪨",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Virupaksha Temple 🛕", date: "" },
      { description: "Explore Vijaya Vittala Temple 🏛️", date: "" },
      { description: "Coracle ride in Tungabhadra River 🛶", date: "" },
      { description: "Sunset at Matanga Hill 🌅", date: "" },
      { description: "Visit Lotus Mahal 🏛️", date: "" },
    ],
  },
  {
    destination: "Mysore 🏰",
    country: "India",
    icon: "location",
    activities: [
      { description: "Visit Mysore Palace 🏰", date: "" },
      { description: "Explore Brindavan Gardens ⛲", date: "" },
      { description: "Visit Chamundeshwari Temple 🛕", date: "" },
      { description: "See St. Philomena's Church ⛪", date: "" },
      { description: "Visit Mysore Zoo 🦁", date: "" },
    ],
  },
  {
    destination: "Rishikesh 🧘",
    country: "India",
    icon: "location",
    activities: [
      { description: "River Rafting in Ganges 🚣", date: "" },
      { description: "Attend Ganga Aarti at Triveni Ghat 🔥", date: "" },
      { description: "Visit Ram Jhula & Laxman Jhula 🌉", date: "" },
      { description: "Yoga session by the river 🧘", date: "" },
      { description: "Visit Beatles Ashram 🎸", date: "" },
    ],
  },
];

// Condition-based templates (Mountains, Beaches, Winter, Summer, Business)
export const CONDITION_PACKING_TEMPLATES: DestinationTemplate[] = [
  // Mountains/Hiking
  {
    destination: "Mountains/Hiking 🏔️",
    icon: "location-outline",
    items: [
      { name: "Hiking boots (broken in) 🥾", category: "Clothes" },
      { name: "Trekking poles 🦯", category: "Essentials" },
      { name: "Backpack (30-50L) 🎒", category: "Essentials" },
      { name: "Water bottles (2-3L capacity) 💧", category: "Essentials" },
      { name: "Water purification tablets 💊", category: "Health" },
      { name: "First aid kit 🩹", category: "Health" },
      { name: "Warm layers (fleece, down jacket) 🧥", category: "Clothes" },
      { name: "Rain gear (jacket & pants) ☔", category: "Clothes" },
      { name: "Headlamp with extra batteries 🔦", category: "Essentials" },
      { name: "Map and compass 🧭", category: "Essentials" },
      { name: "GPS device or app 📱", category: "Electronics" },
      { name: "Energy snacks (bars, nuts) 🍫", category: "Essentials" },
      { name: "Multi-tool or knife 🔪", category: "Essentials" },
      { name: "Emergency whistle 📣", category: "Essentials" },
      { name: "Sunscreen SPF 50+ ☀️", category: "Health" },
      { name: "Sunglasses (UV protection) 🕶️", category: "Accessories" },
      { name: "Hat (sun protection) 🧢", category: "Accessories" },
      { name: "Hiking socks (wool blend) 🧦", category: "Clothes" },
      { name: "Quick-dry clothing 👕", category: "Clothes" },
      { name: "Sleeping bag (if camping) 🛌", category: "Essentials" },
    ],
  },
  // Beaches/Tropical
  {
    destination: "Beaches/Tropical 🌴",
    icon: "sunny",
    items: [
      { name: "Swimwear (2-3 sets) 👙", category: "Clothes" },
      { name: "Sunscreen SPF 50+ (reef-safe) ☀️", category: "Health" },
      { name: "Beach towel (quick-dry) 🧖‍♀️", category: "Essentials" },
      { name: "Flip-flops or sandals 🩴", category: "Clothes" },
      { name: "Wide-brim hat 👒", category: "Accessories" },
      { name: "Sunglasses (polarized) 🕶️", category: "Accessories" },
      { name: "Waterproof phone case 📱", category: "Electronics" },
      { name: "Beach bag (waterproof) 👜", category: "Accessories" },
      { name: "Aloe vera gel (after-sun) 🧴", category: "Health" },
      { name: "Reusable water bottle 💧", category: "Essentials" },
      { name: "Beach umbrella or tent ⛱️", category: "Essentials" },
      { name: "Snorkel gear (optional) 🤿", category: "Essentials" },
      { name: "Water shoes 👟", category: "Clothes" },
      { name: "Lightweight cover-up 👗", category: "Clothes" },
      { name: "Insect repellent 🦟", category: "Health" },
      { name: "Cooling towel 🧊", category: "Essentials" },
      { name: "Portable fan (battery-powered) 🌬️", category: "Electronics" },
      { name: "Beach games (frisbee, paddle ball) 🏸", category: "Essentials" },
    ],
  },
  // Winter/Cold Weather
  {
    destination: "Winter/Cold Weather ❄️",
    icon: "snow",
    items: [
      { name: "Thermal underwear (base layer) 🌡️", category: "Clothes" },
      { name: "Winter coat (insulated) 🧥", category: "Clothes" },
      { name: "Gloves or mittens 🧤", category: "Accessories" },
      { name: "Beanie or warm hat 🧢", category: "Accessories" },
      { name: "Warm socks (wool blend) 🧦", category: "Clothes" },
      { name: "Winter boots (waterproof) 🥾", category: "Clothes" },
      { name: "Hand warmers (disposable) 🔥", category: "Essentials" },
      { name: "Lip balm (SPF) 💄", category: "Health" },
      { name: "Moisturizer (heavy duty) 🧴", category: "Toiletries" },
      { name: "Layers (fleece, wool sweater) 🧥", category: "Clothes" },
      { name: "Scarf or neck gaiter 🧣", category: "Accessories" },
      { name: "Ski goggles (if skiing) 🥽", category: "Accessories" },
      { name: "Hot water bottle 🌡️", category: "Essentials" },
      { name: "Warm pajamas 😴", category: "Clothes" },
      { name: "Thermal socks (extra pairs) 🧦", category: "Clothes" },
      { name: "Ice cleats (for walking) 🧊", category: "Essentials" },
      { name: "Portable heater (if needed) 🔥", category: "Electronics" },
    ],
  },
  // Summer/Hot Weather
  {
    destination: "Summer/Hot Weather ☀️",
    icon: "partly-sunny",
    items: [
      { name: "Lightweight, breathable clothing 👕", category: "Clothes" },
      { name: "Wide-brim hat 👒", category: "Accessories" },
      { name: "Sunscreen SPF 30-50 ☀️", category: "Health" },
      { name: "Cooling towel 🧊", category: "Essentials" },
      { name: "Portable fan (battery-powered) 🌬️", category: "Electronics" },
      { name: "Reusable water bottle (insulated) 💧", category: "Essentials" },
      { name: "Sunglasses (UV protection) 🕶️", category: "Accessories" },
      { name: "Sandals or open-toe shoes 🩴", category: "Clothes" },
      { name: "Insect repellent 🦟", category: "Health" },
      { name: "Lightweight, light-colored clothes 👗", category: "Clothes" },
      { name: "Umbrella (for sun/shade) ☔", category: "Essentials" },
      { name: "Electrolyte packets ⚡", category: "Health" },
      { name: "Aloe vera gel 🧴", category: "Health" },
      { name: "Moisture-wicking clothing 🏃", category: "Clothes" },
      { name: "Portable misting fan 🌬️", category: "Electronics" },
    ],
  },
  // Business Trips
  {
    destination: "Business Trips 💼",
    icon: "briefcase",
    items: [
      { name: "Business attire (suits, blazers) 👔", category: "Clothes" },
      { name: "Laptop and charger 💻", category: "Electronics" },
      { name: "Business documents (printed copies) 📄", category: "Documents" },
      { name: "Business cards 📇", category: "Essentials" },
      { name: "Travel adapter (universal) 🔌", category: "Electronics" },
      { name: "Portable charger/power bank 🔋", category: "Electronics" },
      { name: "Formal shoes (polished) 👞", category: "Clothes" },
      { name: "Briefcase or professional bag 💼", category: "Accessories" },
      { name: "Notebook and pens 🖊️", category: "Essentials" },
      { name: "Presentation materials (USB drive) 💾", category: "Electronics" },
      { name: "Iron or steamer (travel size) 👔", category: "Essentials" },
      { name: "Professional watch ⌚", category: "Accessories" },
      { name: "Grooming kit (hair products, etc.) ✂️", category: "Toiletries" },
      { name: "Extra phone charger 🔌", category: "Electronics" },
      { name: "Travel-size wrinkle release spray 🧴", category: "Toiletries" },
      { name: "Professional portfolio 📂", category: "Essentials" },
    ],
  },
];

// Get templates for a specific destination
export function getTemplatesForDestination(
  destination: string,
  country?: string
): {
  packing: DestinationTemplate[];
  activities: ActivityTemplate[];
} {
  const destinationLower = destination.toLowerCase();
  const countryLower = country?.toLowerCase() || "";

  const packingTemplates = DESTINATION_PACKING_TEMPLATES.filter((template) => {
    const templateDest = template.destination.toLowerCase();
    const templateCountry = template.country?.toLowerCase() || "";
    return (
      templateDest.includes(destinationLower) ||
      destinationLower.includes(templateDest) ||
      templateCountry.includes(countryLower) ||
      countryLower.includes(templateCountry)
    );
  });

  const activityTemplates = DESTINATION_ACTIVITY_TEMPLATES.filter((template) => {
    const templateDest = template.destination.toLowerCase();
    const templateCountry = template.country?.toLowerCase() || "";
    return (
      templateDest.includes(destinationLower) ||
      destinationLower.includes(templateDest) ||
      templateCountry.includes(countryLower) ||
      countryLower.includes(templateCountry)
    );
  });

  // Also check condition-based templates
  const conditionTemplates = CONDITION_PACKING_TEMPLATES.filter((template) => {
    const templateDest = template.destination.toLowerCase();
    return destinationLower.includes(templateDest) || templateDest.includes(destinationLower);
  });

  return {
    packing: packingTemplates.length > 0
      ? packingTemplates
      : conditionTemplates.length > 0
        ? conditionTemplates
        : DESTINATION_PACKING_TEMPLATES.filter(t => t.destination === "Beach/Tropical 🌴" || t.destination === "Business 💼" || t.destination === "Mountain/Hill 🏔️"),
    activities: activityTemplates.length > 0 ? activityTemplates : [],
  };
}

// Get duration-based suggestions
export function getDurationBasedSuggestions(days: number): Array<{ name: string; category: string }> {
  const suggestions: Array<{ name: string; category: string }> = [];

  if (days <= 3) {
    // Short trip
    suggestions.push(
      { name: "Small travel bag 🎒", category: "Essentials" },
      { name: "Minimal toiletries 🧴", category: "Toiletries" },
      { name: "2-3 sets of clothes 👕", category: "Clothes" }
    );
  } else if (days <= 7) {
    // Week trip
    suggestions.push(
      { name: "Medium suitcase 🧳", category: "Essentials" },
      { name: "5-7 sets of clothes 👕", category: "Clothes" },
      { name: "Laundry detergent (travel size) 🧼", category: "Toiletries" }
    );
  } else {
    // Long trip
    suggestions.push(
      { name: "Large suitcase 🧳", category: "Essentials" },
      { name: "Multiple sets of clothes 👕", category: "Clothes" },
      { name: "Laundry supplies 🧼", category: "Toiletries" },
      { name: "Extra storage bags 🛍️", category: "Essentials" }
    );
  }

  return suggestions;
}


// Real-time activity templates
export const REAL_TIME_ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    destination: "Morning Routine 🌅",
    icon: "sunny-outline",
    activities: [
      { description: "Morning Walk 🚶", date: "" },
      { description: "Yoga / Meditation 🧘", date: "" },
      { description: "Breakfast at local cafe ☕", date: "" },
      { description: "Read news / Plan the day 📰", date: "" },
    ],
  },
  {
    destination: "Meals 🍽️",
    icon: "restaurant-outline",
    activities: [
      { description: "Lunch at popular spot 🍔", date: "" },
      { description: "Dinner reservation 🍷", date: "" },
      { description: "Street food tasting 🌮", date: "" },
      { description: "Coffee break ☕", date: "" },
      { description: "Dessert / Ice cream 🍦", date: "" },
    ],
  },
  {
    destination: "Leisure 😌",
    icon: "happy-outline",
    activities: [
      { description: "Shopping at local market 🛍️", date: "" },
      { description: "Relax at park/beach 🌳", date: "" },
      { description: "Photography walk 📷", date: "" },
      { description: "Visit a bookstore 📚", date: "" },
      { description: "Watch sunset 🌇", date: "" },
    ],
  },
  {
    destination: "Nightlife 🌙",
    icon: "moon-outline",
    activities: [
      { description: "Visit a bar/pub 🍻", date: "" },
      { description: "Live music event 🎸", date: "" },
      { description: "Night market 🏮", date: "" },
      { description: "Stargazing ✨", date: "" },
    ],
  },
];

// Get condition-based templates
export function getConditionTemplates(): DestinationTemplate[] {
  return CONDITION_PACKING_TEMPLATES;
}

// Get real-time activity templates
export function getRealTimeActivityTemplates(): ActivityTemplate[] {
  return REAL_TIME_ACTIVITY_TEMPLATES;
}


