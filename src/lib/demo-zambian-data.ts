// Realistic Zambian names and data for demo seeding

export const zambianFirstNames = [
  "Chanda", "Mwamba", "Mutale", "Bwalya", "Chilufya", "Mulenga", "Kasonde", "Nachilima",
  "Chileshe", "Mwansa", "Kabwe", "Musonda", "Tembo", "Banda", "Phiri", "Zulu",
  "Lupiya", "Namukolo", "Chisanga", "Nkandu", "Kaluba", "Mwila", "Sinkala", "Mumba",
  "Chipasha", "Chomba", "Katongo", "Malama", "Chewe", "Ngulube", "Sakala", "Simwanza"
];

export const zambianSurnames = [
  "Phiri", "Banda", "Tembo", "Mwansa", "Zulu", "Lungu", "Mumba", "Kabwe",
  "Mulenga", "Chanda", "Bwalya", "Chilufya", "Musonda", "Ngoma", "Mwila", "Sakala",
  "Simwanza", "Sinkala", "Katongo", "Malama", "Chewe", "Ngulube", "Chomba", "Chipasha"
];

export const zambianCities = [
  { city: "Lusaka", province: "Lusaka" },
  { city: "Ndola", province: "Copperbelt" },
  { city: "Kitwe", province: "Copperbelt" },
  { city: "Livingstone", province: "Southern" },
  { city: "Kabwe", province: "Central" },
  { city: "Chingola", province: "Copperbelt" },
  { city: "Mufulira", province: "Copperbelt" },
  { city: "Luanshya", province: "Copperbelt" },
  { city: "Chipata", province: "Eastern" },
  { city: "Kasama", province: "Northern" },
  { city: "Solwezi", province: "North-Western" },
  { city: "Mongu", province: "Western" },
];

export const zambianAreas = {
  Lusaka: ["Kabulonga", "Woodlands", "Roma", "Chilenje", "Matero", "Kabwata", "Kamwala", "Garden"],
  Ndola: ["Kansenshi", "Masala", "Northrise", "Hillcrest", "Itawa", "Broadway"],
  Kitwe: ["Parklands", "Riverside", "Chimwemwe", "Wusakile", "Nkana East", "Mindolo"],
  Livingstone: ["Maramba", "Dambwa", "Linda", "Highlands", "Town Centre"],
};

export function generateZambianPhone(): string {
  const prefixes = ["95", "96", "97", "76", "77"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+260 ${prefix} ${number.slice(0, 3)} ${number.slice(3)}`;
}

export function generateZambianName(): { firstName: string; surname: string; fullName: string } {
  const firstName = zambianFirstNames[Math.floor(Math.random() * zambianFirstNames.length)];
  const surname = zambianSurnames[Math.floor(Math.random() * zambianSurnames.length)];
  return { firstName, surname, fullName: `${firstName} ${surname}` };
}

export function generateZambianAddress(): { address: string; city: string; province: string } {
  const location = zambianCities[Math.floor(Math.random() * zambianCities.length)];
  const areas = zambianAreas[location.city as keyof typeof zambianAreas] || ["Town Centre"];
  const area = areas[Math.floor(Math.random() * areas.length)];
  const plotNumber = Math.floor(Math.random() * 500) + 1;
  
  return {
    address: `Plot ${plotNumber}, ${area}`,
    city: location.city,
    province: location.province,
  };
}

export function generateZambianEmail(name: { firstName: string; surname: string }): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "zamtel.zm", "coppernet.zm"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const separator = Math.random() > 0.5 ? "." : "";
  const number = Math.random() > 0.5 ? Math.floor(Math.random() * 99) : "";
  return `${name.firstName.toLowerCase()}${separator}${name.surname.toLowerCase()}${number}@${domain}`;
}

// Zambian business names
export const businessNamePrefixes = [
  "Zambia", "Lusaka", "Copper", "Victoria", "African", "Mosi-oa-Tunya", 
  "Zambezi", "Kafue", "Kariba", "Bangweulu", "Luangwa", "Mansa"
];

export const businessNameSuffixes = {
  fashion: ["Fashions", "Designs", "Tailoring", "Couture", "Styles", "Creations"],
  salon: ["Beauty Salon", "Hair Studio", "Spa & Beauty", "Nails & Beauty"],
  retail: ["Mart", "Store", "Supermarket", "Trading", "Enterprises"],
  healthcare: ["Clinic", "Medical Centre", "Health Services", "Pharmacy"],
  agriculture: ["Farms", "Agro", "Harvest", "Green Fields"],
  hospitality: ["Lodge", "Hotel", "Guest House", "Inn"],
  autoshop: ["Motors", "Auto Services", "Car Care", "Garage"],
};

export function generateBusinessName(type: string): string {
  const prefix = businessNamePrefixes[Math.floor(Math.random() * businessNamePrefixes.length)];
  const suffixes = businessNameSuffixes[type as keyof typeof businessNameSuffixes] || ["Enterprises"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
}

// Currency formatting for Zambia
export function formatZMW(amount: number): string {
  return `K${amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
