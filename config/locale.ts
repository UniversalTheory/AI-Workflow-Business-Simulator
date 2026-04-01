/**
 * config/locale.ts
 *
 * Locale configuration for data generation.
 *
 * All market-specific data (zip codes, street names, area codes, neighborhoods)
 * lives here — NOT scattered through generator functions. This means:
 *   - Adding a new market = adding a new locale entry
 *   - Generators stay generic and locale-agnostic
 *   - The active locale is selected at the app level
 *
 * Current active locale: Grand Rapids, MI (the initial target market).
 */

export interface LocaleConfig {
  id: string;
  displayName: string;
  city: string;
  state: string;
  stateAbbr: string;
  /** Area codes to use for phone number generation. */
  areaCodes: string[];
  /** Residential and light commercial zip codes. */
  zipCodes: string[];
  /** Named neighborhoods and districts for address flavor. */
  neighborhoods: string[];
  /** Street names to combine with numbers for address generation. */
  streetNames: string[];
  /** Street suffixes (rotated randomly). */
  streetSuffixes: string[];
  /** Local business domain suffixes for bizEmail generator. */
  emailDomains: string[];
  /** First names pool for fullName generator. */
  firstNames: string[];
  /** Last names pool (skewed toward regional demographics). */
  lastNames: string[];
}

// ---------------------------------------------------------------------------
// Grand Rapids, MI
// ---------------------------------------------------------------------------

export const grLocale: LocaleConfig = {
  id: 'grand-rapids-mi',
  displayName: 'Grand Rapids, MI',
  city: 'Grand Rapids',
  state: 'Michigan',
  stateAbbr: 'MI',
  areaCodes: ['616'],
  zipCodes: [
    '49503', // Downtown / Heritage Hill
    '49504', // West Side / Westtown
    '49505', // Northeast GR / Plainfield
    '49506', // East Hills / Eastown
    '49507', // South Division / Heartside
    '49508', // Wyoming / Kentwood border
    '49509', // Wyoming
    '49512', // Airport / Cascade area
    '49525', // Knapp's Corner / Forest Hills
    '49534', // Standale / Walker
    '49544', // Walker / Comstock Park
    '49546', // Cascade / Forest Hills
  ],
  neighborhoods: [
    'West Side',
    'East Hills',
    'Eastown',
    'Heritage Hill',
    'Heartside',
    'Midtown',
    'Creston',
    'Belknap Lookout',
    'Alger Heights',
    'Baxter',
    'Burton Heights',
    'Wealthy Street',
    'Cherry Hill',
    'Fulton Heights',
    'John Ball Park',
  ],
  streetNames: [
    'Division', 'Fulton', 'Leonard', 'Michigan', 'Burton', 'Kalamazoo',
    'College', 'Eastern', 'Wealthy', 'Hall', 'Grandville', 'Lake Michigan Dr',
    'Alpine', 'Plainfield', 'Monroe', 'Ionia', 'Ottawa', 'Coldbrook',
    'Wealthy', 'Madison', 'Jefferson', 'Lincoln', 'Franklin', 'Logan',
    'Clyde Park', 'Wilson', 'Remembrance', 'Knapp', 'Belmont', 'Cascade',
    'Breton', 'Bates', 'Diamond', 'Godfrey', 'Market', 'Bond',
  ],
  streetSuffixes: [
    'Ave', 'St', 'Dr', 'Blvd', 'Rd', 'Ln', 'Way', 'Ct', 'Pl',
  ],
  emailDomains: [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'comcast.net', 'charter.net', 'att.net',
  ],
  firstNames: [
    // A mix reflecting the Grand Rapids metro demographic
    'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
    'Charles', 'Thomas', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Paul',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
    'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Melissa', 'Deborah',
    'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen', 'Amy',
    'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela', 'Emma',
    'Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Ethan', 'Aiden',
    'Logan', 'Jackson', 'Sebastian', 'Mateo', 'Jack', 'Owen', 'Theodore',
    'Aisha', 'Fatima', 'Zara', 'Layla', 'Amara', 'Nadia', 'Priya', 'Leila',
    'Carlos', 'Miguel', 'Luis', 'Jose', 'Juan', 'Diego', 'Rafael', 'Antonio',
  ],
  lastNames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'DeVries', 'VanDyke', 'Kowalski', 'Patel', 'Chen',
    'Park', 'Kim', 'Okafor', 'Mensah', 'Peterson', 'Larsen', 'Bauer',
    // Dutch surnames common in West Michigan
    'VanderBerg', 'DeJong', 'Hoekstra', 'VanderMolen', 'Bosman', 'Prins',
    'Dekker', 'Visser', 'Smit', 'VanderWaal', 'Brouwer', 'Dijkstra',
  ],
};

// ---------------------------------------------------------------------------
// Locale registry
// To add a new market: create a new LocaleConfig and add it here.
// ---------------------------------------------------------------------------

export const locales: Record<string, LocaleConfig> = {
  'grand-rapids-mi': grLocale,
  // 'detroit-mi': detroitLocale,     // future
  // 'chicago-il': chicagoLocale,     // future
  // 'nashville-tn': nashvilleLocale, // future
};

/** The currently active locale for the application.
 *  To change markets, update this reference (or make it runtime-configurable). */
export const activeLocale: LocaleConfig = grLocale;
