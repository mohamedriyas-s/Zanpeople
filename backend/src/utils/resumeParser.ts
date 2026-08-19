import * as pdfParseModule from 'pdf-parse';

// Handle both ES module default exports and CommonJS exports
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
export interface ParsedResumeData {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  positionApplied: string | null;
  yearsExperience: number | null;
  currentCompany: string | null;
  noticePeriod: string | null;
  currentSalary: number | null;
  expectedSalary: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  personalWebsiteUrl: string | null;
  skills: string[];
  summary: string | null;
}

// ─── Common skill keywords (case-insensitive match) ─────────────

const KNOWN_SKILLS = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Golang', 'Rust',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'Dart', 'Elixir', 'Clojure',
  // Frontend
  'React', 'React.js', 'ReactJS', 'Angular', 'Vue', 'Vue.js', 'VueJS', 'Next.js', 'NextJS',
  'Nuxt.js', 'Svelte', 'jQuery', 'HTML', 'HTML5', 'CSS', 'CSS3', 'SASS', 'SCSS', 'LESS',
  'TailwindCSS', 'Tailwind', 'Bootstrap', 'Material UI', 'Chakra UI',
  // Backend
  'Node.js', 'NodeJS', 'Express', 'Express.js', 'NestJS', 'FastAPI', 'Flask', 'Django',
  'Spring', 'Spring Boot', 'ASP.NET', '.NET', 'Rails', 'Ruby on Rails', 'Laravel',
  // Database
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB',
  'Firebase', 'Firestore', 'Cassandra', 'Oracle', 'SQLite', 'MariaDB', 'CouchDB',
  'Prisma', 'Sequelize', 'Mongoose', 'TypeORM',
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s', 'Terraform',
  'Ansible', 'Jenkins', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'CircleCI',
  'Nginx', 'Apache', 'Linux', 'Ubuntu', 'Vercel', 'Netlify', 'Heroku',
  // Data & ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'Scikit-learn', 'NLP', 'Computer Vision', 'Data Science', 'Data Engineering',
  'Apache Spark', 'Hadoop', 'Kafka', 'Airflow',
  // Mobile
  'React Native', 'Flutter', 'iOS', 'Android', 'SwiftUI', 'Jetpack Compose',
  // Testing
  'Jest', 'Mocha', 'Cypress', 'Selenium', 'Playwright', 'JUnit', 'pytest',
  'TestNG', 'Postman', 'REST API',
  // Tools & Misc
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Figma',
  'GraphQL', 'REST', 'gRPC', 'WebSocket', 'RabbitMQ', 'Microservices',
  'Agile', 'Scrum', 'Kanban', 'DevOps', 'SRE',
  'Power BI', 'Tableau', 'Excel', 'SAP',
];

// ─── Indian states for location detection ───────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'New Delhi',
];

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow',
  'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
  'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Coimbatore',
  'Noida', 'Gurgaon', 'Gurugram', 'Chandigarh', 'Kochi', 'Trivandrum',
  'Thiruvananthapuram', 'Mysore', 'Mysuru', 'Mangalore', 'Mangaluru',
];

// ─── Main parse function ────────────────────────────────────────

export async function parseResumeBuffer(buffer: Buffer): Promise<ParsedResumeData> {
  const pdfData = await pdfParse(buffer);
  const rawText = pdfData.text;

  // Normalize whitespace but keep line structure
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

  const result: ParsedResumeData = {
    name: extractName(lines, text),
    email: extractEmail(text),
    phone: extractPhone(text),
    address: null,
    city: extractCity(text),
    state: extractState(text),
    country: extractCountry(text),
    positionApplied: extractJobTitle(lines, text),
    yearsExperience: extractExperience(text),
    currentCompany: extractCurrentCompany(lines, text),
    noticePeriod: extractNoticePeriod(text),
    currentSalary: null,
    expectedSalary: null,
    linkedinUrl: extractLinkedIn(text),
    githubUrl: extractGitHub(text),
    portfolioUrl: extractPortfolio(text),
    personalWebsiteUrl: extractPersonalWebsite(text),
    skills: extractSkills(text),
    summary: extractSummary(lines, text),
  };

  return result;
}

// ─── Extraction helpers ─────────────────────────────────────────

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text: string): string | null {
  // Match Indian (+91) and international formats
  const patterns = [
    /(?:\+91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}/,           // +91 98765 43210
    /(?:\+91[\s.-]?)?\d{5}[\s.-]?\d{5}/,                 // 98765 43210
    /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, // (123) 456-7890
    /(?:\+\d{1,3}[\s.-]?)\d{7,12}/,                      // +1 1234567890
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let phone = match[0].replace(/[^+\d]/g, '');
      if (phone.length >= 10) return phone;
    }
  }
  return null;
}

function extractName(lines: string[], text: string): string | null {
  // Strategy 1: Look for labeled "Name:" field
  const nameLabel = text.match(/(?:name|full\s*name)\s*[:\-–]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/i);
  if (nameLabel) return nameLabel[1].trim();

  // Strategy 2: The first meaningful line in a resume is often the name
  // Skip lines that look like headers, titles, or URLs
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip if it looks like a section header, URL, email, phone, or too long
    if (line.length > 40) continue;
    if (line.length < 3) continue;
    if (/@|http|www|\.com|\.org|\.net/i.test(line)) continue;
    if (/^\+?\d[\d\s\-().]{7,}$/.test(line)) continue;
    if (/^(resume|curriculum|cv|profile|portfolio|objective|summary|about)/i.test(line)) continue;

    // Check if it looks like a name (2-4 capitalized words)
    const nameCheck = line.match(/^([A-Z][a-zA-Z'.]+(?:\s+[A-Z][a-zA-Z'.]+){0,3})$/);
    if (nameCheck) return nameCheck[1];

    // Also match names in mixed case
    const nameParts = line.split(/\s+/).filter(w => /^[A-Z][a-zA-Z'.]+$/.test(w));
    if (nameParts.length >= 2 && nameParts.length <= 4 && line.length < 35) {
      return nameParts.join(' ');
    }
  }

  return null;
}

function extractLinkedIn(text: string): string | null {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_.%]+\/?/i);
  if (match) {
    let url = match[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    return url;
  }
  return null;
}

function extractGitHub(text: string): string | null {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-_.]+\/?/i);
  if (match) {
    let url = match[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    return url;
  }
  return null;
}

function extractPortfolio(text: string): string | null {
  // Look for portfolio-specific URLs
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:behance\.net|dribbble\.com|codepen\.io)\/[a-zA-Z0-9\-_.]+\/?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let url = match[0];
      if (!url.startsWith('http')) url = 'https://' + url;
      return url;
    }
  }
  return null;
}

function extractPersonalWebsite(text: string): string | null {
  // Look for URLs that aren't social media or email
  const urlMatch = text.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github|behance|dribbble|codepen|gmail|google|facebook|twitter|instagram|youtube)\.)[a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,}(?:\/[^\s)]*)?/gi);
  if (urlMatch) {
    // Return the first one that looks like a personal site
    for (const url of urlMatch) {
      if (!/mail|smtp|api|cdn|blob|s3|zansphere/i.test(url)) return url;
    }
  }
  return null;
}

function extractExperience(text: string): number | null {
  // Look for explicit experience mentions
  const patterns = [
    /(\d+\.?\d*)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp|work)/i,
    /(?:experience|exp|work)\s*[:\-–]?\s*(\d+\.?\d*)\+?\s*(?:years?|yrs?)/i,
    /(?:total|overall)\s*(?:experience|exp)\s*[:\-–]?\s*(\d+\.?\d*)\+?\s*(?:years?|yrs?)/i,
    /(\d+\.?\d*)\+?\s*(?:years?|yrs?)\s*(?:in|of)\s*(?:IT|software|development|engineering)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseFloat(match[1]);
      if (years >= 0 && years <= 50) return years;
    }
  }

  return null;
}

function extractCurrentCompany(lines: string[], text: string): string | null {
  // Look for "Current Company:" or "Currently at:" patterns
  const patterns = [
    /(?:current|present)\s*(?:company|employer|organization|org)\s*[:\-–]\s*(.+)/i,
    /(?:currently|presently)\s*(?:working|employed)\s*(?:at|with|in)\s*(.+?)(?:\.|,|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 100);
  }

  // Look in experience section — the first company mentioned after "Experience" is likely current
  const expIdx = lines.findIndex(l => /^(?:work\s+)?experience|employment\s*history/i.test(l));
  if (expIdx >= 0) {
    // Scan next few lines for a company-like name
    for (let i = expIdx + 1; i < Math.min(expIdx + 6, lines.length); i++) {
      const line = lines[i];
      // Skip dates, titles that are too short
      if (/^\d{4}|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line)) continue;
      if (line.length < 3 || line.length > 80) continue;
      // Likely a company name if it has Pvt, Ltd, Inc, LLC, Corp, Technologies, Solutions, etc.
      if (/(?:pvt|ltd|inc|llc|corp|technologies|solutions|systems|services|consulting|software|labs?|studio|group|digital|tech)\b/i.test(line)) {
        return line.substring(0, 100);
      }
    }
  }

  return null;
}

function extractJobTitle(lines: string[], text: string): string | null {
  // Look for explicit title/position fields
  const labelMatch = text.match(/(?:designation|title|role|position)\s*[:\-–]\s*(.+?)(?:\n|$)/i);
  if (labelMatch) return labelMatch[1].trim().substring(0, 100);

  // Look for common job titles near the top of the resume
  const titlePatterns = [
    /\b((?:senior|sr\.?|junior|jr\.?|lead|principal|staff|chief|head|vp|director)\s+)?(?:software|web|frontend|front-end|backend|back-end|full\s*stack|fullstack|mobile|ios|android|devops|cloud|data|ml|ai|qa|quality|test|site\s*reliability|platform|product|project|program|ux|ui|ux\/ui)\s*(?:engineer|developer|architect|manager|designer|analyst|consultant|specialist|scientist|tester|admin|administrator|lead|ops)\b/i,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  return null;
}

function extractNoticePeriod(text: string): string | null {
  const match = text.match(/(?:notice\s*period)\s*[:\-–]?\s*(\d+\s*(?:days?|months?|weeks?)(?:\s*\(negotiable\))?)/i);
  return match ? match[1].trim() : null;
}

function extractCity(text: string): string | null {
  for (const city of INDIAN_CITIES) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(text)) return city;
  }
  return null;
}

function extractState(text: string): string | null {
  for (const state of INDIAN_STATES) {
    if (new RegExp(`\\b${state}\\b`, 'i').test(text)) return state;
  }
  return null;
}

function extractCountry(text: string): string | null {
  if (/\bIndia\b/i.test(text)) return 'India';
  if (/\bUnited States\b|\bUSA\b|\bU\.S\.A/i.test(text)) return 'United States';
  if (/\bUnited Kingdom\b|\bUK\b/i.test(text)) return 'United Kingdom';
  if (/\bCanada\b/i.test(text)) return 'Canada';
  if (/\bAustralia\b/i.test(text)) return 'Australia';
  if (/\bGermany\b/i.test(text)) return 'Germany';
  if (/\bSingapore\b/i.test(text)) return 'Singapore';
  return null;
}

function extractSkills(text: string): string[] {
  const found = new Set<string>();

  // Strategy 1: Look in a dedicated "Skills" section
  const skillsSectionMatch = text.match(/(?:technical\s+)?skills?\s*[:\-–]?\s*([\s\S]*?)(?:\n\s*\n|(?=\n(?:experience|education|project|certif|award|achiev|hobby|interest|language|reference|declaration|personal)))/i);
  const skillsText = skillsSectionMatch ? skillsSectionMatch[1] : text;

  // Strategy 2: Match known skills
  for (const skill of KNOWN_SKILLS) {
    // Word boundary matching — handle special chars like C++, C#, .NET
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;|/•·\\-])${escaped}(?:[\\s,;|/•·\\-]|$)`, 'i');

    if (regex.test(skillsText)) {
      // Normalize common variants
      const normalized = normalizeSkillName(skill);
      found.add(normalized);
    }
  }

  return Array.from(found).slice(0, 25); // Cap at 25 skills
}

function normalizeSkillName(skill: string): string {
  const map: Record<string, string> = {
    'ReactJS': 'React',
    'React.js': 'React',
    'VueJS': 'Vue.js',
    'NodeJS': 'Node.js',
    'NextJS': 'Next.js',
    'Golang': 'Go',
    'Bangalore': 'Bengaluru',
    'Gurugram': 'Gurgaon',
    'K8s': 'Kubernetes',
  };
  return map[skill] || skill;
}

function extractSummary(lines: string[], text: string): string | null {
  const summaryMatch = text.match(/(?:summary|objective|about\s*me|profile)\s*[:\-–]?\s*([\s\S]*?)(?:\n\s*\n|(?=\n(?:experience|education|skills|technical|project|certif)))/i);
  if (summaryMatch) {
    const summary = summaryMatch[1].trim();
    if (summary.length > 20 && summary.length < 1000) return summary;
  }
  return null;
}
