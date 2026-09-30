import { Address, Gender } from '../interfaces/customer';

// Test customers look like a shop's clientele: adults of every age, so the
// names run from the traditional ones of their grandparents' generation to
// today's, and they live all over the country, towns and villages included.

const MALE_FIRST_NAMES = [
  'Gheorghe',
  'Ioan',
  'Constantin',
  'Nicolae',
  'Vasile',
  'Petru',
  'Dumitru',
  'Aurel',
  'Costel',
  'Viorel',
  'Marin',
  'Grigore',
  'Mircea',
  'Valentin',
  'Nelu',
  'Iulian',
  'Laurențiu',
  'Doru',
  'Traian',
  'Eugen',
  'Dorin',
  'Florin',
  'Mihai',
  'Alin',
  'Robert',
  'Claudiu',
  'Sergiu',
  'Darius',
  'Denis',
  'Rareș',
  'Luca',
  'David',
  'Matei',
  'Eduard',
  'Fabian',
  'Patrick',
];

const FEMALE_FIRST_NAMES = [
  'Elisabeta',
  'Floarea',
  'Viorica',
  'Aurelia',
  'Rodica',
  'Lucreția',
  'Maricica',
  'Ecaterina',
  'Paraschiva',
  'Stela',
  'Doina',
  'Mariana',
  'Liliana',
  'Camelia',
  'Loredana',
  'Luminița',
  'Gina',
  'Otilia',
  'Emilia',
  'Violeta',
  'Florentina',
  'Claudia',
  'Silvia',
  'Andreea',
  'Cristiana',
  'Sorina',
  'Delia',
  'Patricia',
  'Antonia',
  'Sara',
  'Daria',
  'Maya',
  'Rebeca',
  'Evelina',
  'Ilinca',
  'Karina',
];

const LAST_NAMES = [
  'Ciobanu',
  'Lungu',
  'Stanciu',
  'Tănase',
  'Chiriac',
  'Zamfir',
  'Mihăilă',
  'Ene',
  'Vasilescu',
  'Grigore',
  'Anghel',
  'Iordache',
  'Bratu',
  'Coman',
  'Petrescu',
  'Stoian',
  'Andrei',
  'Tudor',
  'Căpraru',
  'Pîrvu',
  'Husar',
  'Bogdan',
  'Lazăr',
  'Mitrea',
  'Olteanu',
  'Păun',
  'Roman',
  'Sandu',
  'Țurcanu',
  'Vasile',
  'Buzatu',
  'Cozma',
  'Hrițcu',
  'Lupașcu',
  'Tofan',
  'Rotaru',
  'Onu',
  'Cazacu',
  'Avram',
  'Manea',
];

// Every county, and not only its seat: smaller towns and villages as well.
const PLACES: ReadonlyArray<{
  county: string;
  city: string;
  postalPrefix: string;
}> = [
  { county: 'Alba', city: 'Blaj', postalPrefix: '515' },
  { county: 'Arad', city: 'Lipova', postalPrefix: '315' },
  { county: 'Argeș', city: 'Curtea de Argeș', postalPrefix: '115' },
  { county: 'Bacău', city: 'Onești', postalPrefix: '601' },
  { county: 'Bihor', city: 'Beiuș', postalPrefix: '415' },
  { county: 'Bistrița-Năsăud', city: 'Năsăud', postalPrefix: '425' },
  { county: 'Botoșani', city: 'Dorohoi', postalPrefix: '715' },
  { county: 'Brăila', city: 'Brăila', postalPrefix: '810' },
  { county: 'Brașov', city: 'Făgăraș', postalPrefix: '505' },
  { county: 'Buzău', city: 'Râmnicu Sărat', postalPrefix: '125' },
  { county: 'Călărași', city: 'Oltenița', postalPrefix: '915' },
  { county: 'Caraș-Severin', city: 'Caransebeș', postalPrefix: '325' },
  { county: 'Cluj', city: 'Turda', postalPrefix: '401' },
  { county: 'Constanța', city: 'Mangalia', postalPrefix: '905' },
  { county: 'Covasna', city: 'Târgu Secuiesc', postalPrefix: '525' },
  { county: 'Dâmbovița', city: 'Pucioasa', postalPrefix: '135' },
  { county: 'Dolj', city: 'Băilești', postalPrefix: '205' },
  { county: 'Galați', city: 'Tecuci', postalPrefix: '805' },
  { county: 'Giurgiu', city: 'Giurgiu', postalPrefix: '080' },
  { county: 'Gorj', city: 'Motru', postalPrefix: '215' },
  { county: 'Harghita', city: 'Odorheiu Secuiesc', postalPrefix: '535' },
  { county: 'Hunedoara', city: 'Hațeg', postalPrefix: '335' },
  { county: 'Ialomița', city: 'Slobozia', postalPrefix: '920' },
  { county: 'Iași', city: 'Pașcani', postalPrefix: '705' },
  { county: 'Maramureș', city: 'Sighetu Marmației', postalPrefix: '435' },
  { county: 'Mehedinți', city: 'Drobeta-Turnu Severin', postalPrefix: '220' },
  { county: 'Mureș', city: 'Sighișoara', postalPrefix: '545' },
  { county: 'Neamț', city: 'Târgu Neamț', postalPrefix: '615' },
  { county: 'Olt', city: 'Caracal', postalPrefix: '235' },
  { county: 'Prahova', city: 'Câmpina', postalPrefix: '105' },
  { county: 'Sălaj', city: 'Zalău', postalPrefix: '450' },
  { county: 'Satu Mare', city: 'Carei', postalPrefix: '445' },
  { county: 'Sibiu', city: 'Mediaș', postalPrefix: '551' },
  { county: 'Suceava', city: 'Câmpulung Moldovenesc', postalPrefix: '725' },
  { county: 'Teleorman', city: 'Roșiorii de Vede', postalPrefix: '145' },
  { county: 'Timiș', city: 'Lugoj', postalPrefix: '305' },
  { county: 'Tulcea', city: 'Sulina', postalPrefix: '825' },
  { county: 'Vâlcea', city: 'Horezu', postalPrefix: '245' },
  { county: 'Vaslui', city: 'Bârlad', postalPrefix: '731' },
  { county: 'Vrancea', city: 'Focșani', postalPrefix: '620' },
  { county: 'Ilfov', city: 'Snagov', postalPrefix: '077' },
  { county: 'Cluj', city: 'Huedin', postalPrefix: '405' },
  { county: 'Suceava', city: 'Vatra Dornei', postalPrefix: '725' },
  { county: 'Bacău', city: 'Moinești', postalPrefix: '605' },
];

const STREETS = [
  'Strada Principală',
  'Strada Gării',
  'Strada Școlii',
  'Strada Bisericii',
  'Strada Morii',
  'Strada Viilor',
  'Strada Plopilor',
  'Strada Salcâmilor',
  'Strada Libertății',
  'Strada Unirii',
  'Strada Mihail Kogălniceanu',
  'Strada Vasile Alecsandri',
  'Strada Ion Creangă',
  'Strada Liviu Rebreanu',
  'Strada Cuza Vodă',
  'Strada Ștefan cel Mare',
  'Strada Frasinului',
  'Strada Dealului',
  'Strada Izvorului',
  'Aleea Trandafirilor',
  'Piața Centrală',
  'Calea Națională',
  'Drumul Sării',
  'Strada Pescarilor',
];

const EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'posta.example.com',
];

const NICKNAMES = [
  'soare',
  'munte',
  'lup',
  'vulpe',
  'dor',
  'nor',
  'star',
  'cool',
  'bebe',
  'rocky',
];

export const GENDER_WEIGHTS: ReadonlyArray<{ gender: Gender; weight: number }> =
  [
    { gender: Gender.Male, weight: 46 },
    { gender: Gender.Female, weight: 46 },
    { gender: Gender.NotDeclared, weight: 8 },
  ];

function pick<T>(values: ReadonlyArray<T>): T {
  return values[Math.floor(Math.random() * values.length)];
}

function pickWeighted<T extends { weight: number }>(
  values: ReadonlyArray<T>,
): T {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let roll = Math.random() * total;
  for (const value of values) {
    roll -= value.weight;
    if (roll < 0) return value;
  }
  return values[values.length - 1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDigits(length: number): string {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

function toIsoDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function forEmail(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z-]/g, '');
}

// Generated records carry this word after their names, so they are easy to
// tell apart from real ones and to find again.
const TEST_SUFFIX = 'Test';

export function randomGender(): Gender {
  return pickWeighted(GENDER_WEIGHTS).gender;
}

function firstNameFor(gender: Gender): string {
  if (gender === Gender.Male) return pick(MALE_FIRST_NAMES);
  if (gender === Gender.Female) return pick(FEMALE_FIRST_NAMES);
  return pick(Math.random() < 0.5 ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
}

// Tries again until the value is not in `taken`, then claims it.
function uniqueValue(taken: Set<string>, candidate: () => string): string {
  let value = candidate();
  while (taken.has(value)) value = candidate();
  taken.add(value);
  return value;
}

function randomEmail(
  firstName: string,
  lastName: string,
  birthYear: number,
): string {
  const first = forEmail(firstName);
  const last = forEmail(lastName);
  const local = pick([
    `${first}.${last}`,
    `${first}${last}`,
    `${last}${first[0]}`,
    `${first}_${birthYear}`,
    `${first}.${pick(NICKNAMES)}`,
    `${pick(NICKNAMES)}_${last}`,
    `${first}${last[0]}${birthYear % 100}`,
  ]);
  const number = Math.random() < 0.5 ? randomInt(1, 99).toString() : '';
  return `${local}${number}@${pick(EMAIL_DOMAINS)}`;
}

function randomPhoneNumber(): string {
  return `07${randomInt(2, 9)}${randomDigits(7)}`;
}

export interface RandomCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  birthDate: string;
  enrollmentDate: string;
  address: Address;
}

// Aged 18 to 88 today, enrolled between the given dates but never before
// turning 18. `taken` holds the emails and phone numbers already used in this
// run.
export function buildRandomCustomer(
  enrolledFrom: Date,
  enrolledTo: Date,
  taken: Set<string>,
): RandomCustomer {
  const gender = randomGender();
  const firstName = firstNameFor(gender);
  const lastName =
    gender === Gender.Female && Math.random() < 0.15
      ? `${pick(LAST_NAMES)}-${pick(LAST_NAMES)}`
      : pick(LAST_NAMES);

  const today = new Date();
  const born = randomDateBetween(
    new Date(today.getFullYear() - 88, today.getMonth(), today.getDate()),
    new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()),
  );
  const adult = new Date(born);
  adult.setFullYear(born.getFullYear() + 18);
  const enrolled = randomDateBetween(
    adult > enrolledFrom ? adult : enrolledFrom,
    adult > enrolledTo ? adult : enrolledTo,
  );

  const { county, city, postalPrefix } = pick(PLACES);

  return {
    firstName: firstName + TEST_SUFFIX,
    lastName: lastName + TEST_SUFFIX,
    email: uniqueValue(taken, () =>
      randomEmail(firstName, lastName, born.getFullYear()),
    ),
    phoneNumber: uniqueValue(taken, randomPhoneNumber),
    gender,
    birthDate: toIsoDate(born),
    enrollmentDate: toIsoDate(enrolled),
    address: {
      country: 'Romania',
      county,
      city,
      street: pick(STREETS),
      streetNumber:
        Math.random() < 0.2
          ? `${randomInt(1, 60)}, bl. ${pick(['A', 'B', 'C', 'D'])}${randomInt(1, 12)}, ap. ${randomInt(1, 60)}`
          : randomInt(1, 250).toString(),
      postalCode: `${postalPrefix}${randomDigits(6 - postalPrefix.length)}`,
    },
  };
}
