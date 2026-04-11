import type { Session, Speaker, Sponsor, Venue, Update, FaqItem } from "@/types";

export const CONFERENCE = {
  name: "DevSummit 2026",
  tagline: "The Future of Software Engineering",
  dates: "September 14–16, 2026",
  location: "San Francisco, CA",
  welcomeMessage:
    "Welcome to DevSummit 2026 — three days of cutting-edge talks, workshops, and networking with the world's best software engineers. Dive in, connect, and leave inspired.",
};

export const SPEAKERS: Speaker[] = [
  {
    id: "s1",
    name: "Aria Chen",
    title: "Principal Engineer",
    company: "Vercel",
    bio: "Aria leads infrastructure at Vercel, focusing on edge computing and developer experience. She has 15 years of experience building distributed systems and is a frequent contributor to open-source projects. Previously she led platform teams at Stripe and Cloudflare.",
    photo: "https://i.pravatar.cc/300?img=47",
    sessionIds: ["session1"],
    social: { twitter: "@ariachen_dev", linkedin: "ariachen" },
  },
  {
    id: "s2",
    name: "Marcus Webb",
    title: "VP of Engineering",
    company: "Linear",
    bio: "Marcus has spent a decade building products that developers love. At Linear he oversees engineering across product, infrastructure, and design systems. He's passionate about craftsmanship, and the intersection of design and engineering.",
    photo: "https://i.pravatar.cc/300?img=12",
    sessionIds: ["session2"],
    social: { twitter: "@marcuswebb", linkedin: "marcuswebb" },
  },
  {
    id: "s3",
    name: "Priya Nair",
    title: "Staff Engineer",
    company: "Figma",
    bio: "Priya works on Figma's collaborative infrastructure, focusing on real-time sync, conflict resolution, and scaling operational transforms at millions-of-users scale. She's a frequent speaker at distributed systems conferences.",
    photo: "https://i.pravatar.cc/300?img=23",
    sessionIds: ["session3", "session7"],
    social: { twitter: "@priyanair_eng" },
  },
  {
    id: "s4",
    name: "James O'Brien",
    title: "CEO",
    company: "Supabase",
    bio: "James co-founded Supabase with the mission of making backend development as fast and fun as frontend development. Before Supabase, he worked on cloud infrastructure at AWS and developer tooling at GitHub.",
    photo: "https://i.pravatar.cc/300?img=33",
    sessionIds: ["session4"],
    social: { twitter: "@jamesobrien", linkedin: "jamesobrien" },
  },
  {
    id: "s5",
    name: "Elena Vasquez",
    title: "AI Research Engineer",
    company: "Anthropic",
    bio: "Elena works at the intersection of language models and software engineering tools. Her research focuses on AI-assisted coding, code generation quality, and responsible AI deployment in developer workflows.",
    photo: "https://i.pravatar.cc/300?img=56",
    sessionIds: ["session5"],
    social: { twitter: "@elenavasquez_ai" },
  },
  {
    id: "s6",
    name: "Daniel Kim",
    title: "Engineering Manager",
    company: "Shopify",
    bio: "Daniel manages platform reliability at Shopify, overseeing observability, incident response, and SLO programs across 200+ microservices. He's an avid advocate for blameless post-mortems and psychological safety in engineering teams.",
    photo: "https://i.pravatar.cc/300?img=68",
    sessionIds: ["session6"],
    social: { linkedin: "danielkim" },
  },
  {
    id: "s7",
    name: "Leila Moradi",
    title: "Open Source Lead",
    company: "Mozilla",
    bio: "Leila champions open-source development at Mozilla, leading community initiatives for Firefox and developer tooling. She's a contributor to TC39, the JavaScript standards committee, and has spoken at conferences worldwide.",
    photo: "https://i.pravatar.cc/300?img=9",
    sessionIds: ["session8"],
    social: { twitter: "@leilamoradi", linkedin: "leilamoradi" },
  },
  {
    id: "s8",
    name: "Ryan Tompkins",
    title: "Head of Platform",
    company: "Databricks",
    bio: "Ryan leads platform engineering at Databricks, building the infrastructure that powers data-intensive AI workloads. He previously built distributed storage systems at Meta and taught distributed systems at UC Berkeley.",
    photo: "https://i.pravatar.cc/300?img=3",
    sessionIds: ["session9"],
    social: { twitter: "@ryantompkins", linkedin: "ryantompkins" },
  },
];

export const SESSIONS: Session[] = [
  {
    id: "session1",
    title: "Edge-First Architecture: The Next Paradigm",
    description:
      "Explore how moving computation to the edge changes everything about how we think about latency, data locality, and user experience. This talk covers practical patterns for building edge-first applications, from routing to data hydration, with real-world examples from Vercel's infrastructure.",
    startTime: "9:00 AM",
    endTime: "9:50 AM",
    day: "Day 1",
    room: "Main Stage",
    track: "Architecture",
    speakerIds: ["s1"],
    tags: ["edge", "performance", "architecture"],
  },
  {
    id: "session2",
    title: "Design Systems at Scale: Lessons from Linear",
    description:
      "Building a design system that a fast-moving team actually uses is hard. Marcus shares what worked, what failed, and how Linear maintains a system used by thousands of external developers. Topics include versioning, contribution workflows, and keeping tokens in sync across codebases.",
    startTime: "10:15 AM",
    endTime: "11:00 AM",
    day: "Day 1",
    room: "Hall B",
    track: "Frontend",
    speakerIds: ["s2"],
    tags: ["design systems", "ui", "frontend"],
  },
  {
    id: "session3",
    title: "Real-Time Collaboration at Scale",
    description:
      "Figma handles millions of concurrent operations with sub-50ms sync. Priya walks through the operational transform and CRDT implementations that power Figma's multiplayer, the failure modes they've encountered, and the lessons applicable to any collaborative app.",
    startTime: "11:30 AM",
    endTime: "12:15 PM",
    day: "Day 1",
    room: "Main Stage",
    track: "Backend",
    speakerIds: ["s3"],
    tags: ["real-time", "crdt", "distributed"],
  },
  {
    id: "session4",
    title: "Postgres as a Platform: Going Beyond the DB",
    description:
      "Supabase is bet-the-company on Postgres. James explains why Postgres is more than a database — it's a programmable, extensible platform. The talk covers logical replication, row-level security, edge functions triggered by DB events, and the vision for Postgres-as-cloud-infrastructure.",
    startTime: "2:00 PM",
    endTime: "2:50 PM",
    day: "Day 1",
    room: "Hall A",
    track: "Backend",
    speakerIds: ["s4"],
    tags: ["postgres", "database", "backend"],
  },
  {
    id: "session5",
    title: "AI Code Generation: State of the Art",
    description:
      "Where are AI coding tools today, and where are they heading? Elena reviews the quality ceiling of current LLM-generated code, the evaluation benchmarks, and what's needed to move from autocomplete to genuine software-engineering assistants. Includes live demos and critical analysis of popular tools.",
    startTime: "3:15 PM",
    endTime: "4:00 PM",
    day: "Day 1",
    room: "Main Stage",
    track: "AI & ML",
    speakerIds: ["s5"],
    tags: ["ai", "llm", "code generation"],
  },
  {
    id: "session6",
    title: "Building a Culture of Reliability",
    description:
      "SLOs, error budgets, and runbooks aren't about perfection — they're about trust. Daniel breaks down how Shopify transformed its on-call culture, reduced incident duration by 60%, and shifted from blame-first to learning-first incident management. Practical, no-fluff takeaways for platform teams.",
    startTime: "4:30 PM",
    endTime: "5:15 PM",
    day: "Day 1",
    room: "Hall B",
    track: "DevOps",
    speakerIds: ["s6"],
    tags: ["reliability", "slo", "devops"],
  },
  {
    id: "session7",
    title: "Workshop: Conflict-Free Data Structures in Practice",
    description:
      "Hands-on workshop led by Priya. Participants will implement a basic CRDT-backed shared document from scratch. Prerequisite: familiarity with JavaScript. Bring a laptop. Max 40 attendees.",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    day: "Day 2",
    room: "Workshop Room 1",
    track: "Workshops",
    speakerIds: ["s3"],
    tags: ["crdt", "workshop", "hands-on"],
  },
  {
    id: "session8",
    title: "The Open Web in 2026: Challenges and Opportunities",
    description:
      "The web's openness has never been under more pressure — from platform lock-in, from privacy regulation, and from the accelerating pace of browser standardization. Leila presents Mozilla's perspective on where standards are heading and how developers can contribute to a web that remains open.",
    startTime: "1:00 PM",
    endTime: "1:45 PM",
    day: "Day 2",
    room: "Main Stage",
    track: "Open Source",
    speakerIds: ["s7"],
    tags: ["open source", "web standards", "browsers"],
  },
  {
    id: "session9",
    title: "Data-Intensive Applications on Modern Infrastructure",
    description:
      "Ryan shares how Databricks handles exabyte-scale data workloads, the architecture decisions that enabled that scale, and what those lessons mean for teams building data pipelines and ML infrastructure at any scale. Deep-dives into Apache Spark optimization and storage layer design.",
    startTime: "2:30 PM",
    endTime: "3:20 PM",
    day: "Day 2",
    room: "Hall A",
    track: "Data & AI",
    speakerIds: ["s8"],
    tags: ["data", "ml", "infrastructure"],
  },
  {
    id: "session10",
    title: "Keynote: The Next 10 Years of Software Engineering",
    description:
      "A forward-looking conversation with our panel of industry leaders on where software engineering is heading: AI-augmented workflows, declarative infrastructure, WebAssembly, and the evolving role of the engineer. Q&A to follow.",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    day: "Day 3",
    room: "Main Stage",
    track: "Keynote",
    speakerIds: ["s1", "s4", "s5"],
    tags: ["keynote", "future", "panel"],
  },
];

export const SPONSORS: Sponsor[] = [
  {
    id: "sp1",
    name: "Vercel",
    tier: "platinum",
    logo: "https://logo.clearbit.com/vercel.com",
    website: "https://vercel.com",
    description:
      "Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.",
    booth: "Booth A1",
  },
  {
    id: "sp2",
    name: "Supabase",
    tier: "platinum",
    logo: "https://logo.clearbit.com/supabase.com",
    website: "https://supabase.com",
    description:
      "Supabase is an open source Firebase alternative, offering a Postgres database, authentication, instant APIs, edge functions, and storage.",
    booth: "Booth A2",
  },
  {
    id: "sp3",
    name: "Anthropic",
    tier: "gold",
    logo: "https://logo.clearbit.com/anthropic.com",
    website: "https://anthropic.com",
    description:
      "Anthropic is an AI safety company working to build reliable, interpretable, and steerable AI systems.",
    booth: "Booth B1",
  },
  {
    id: "sp4",
    name: "Linear",
    tier: "gold",
    logo: "https://logo.clearbit.com/linear.app",
    website: "https://linear.app",
    description:
      "Linear is the issue tracking tool built for high-performance teams. Streamline software projects, sprints, tasks, and bug tracking.",
    booth: "Booth B2",
  },
  {
    id: "sp5",
    name: "Databricks",
    tier: "gold",
    logo: "https://logo.clearbit.com/databricks.com",
    website: "https://databricks.com",
    description:
      "Databricks is the lakehouse company. Unify data, analytics, and AI on a single platform.",
  },
  {
    id: "sp6",
    name: "Netlify",
    tier: "silver",
    logo: "https://logo.clearbit.com/netlify.com",
    website: "https://netlify.com",
    description:
      "Netlify is a cloud platform for building and deploying modern web apps.",
    booth: "Booth C1",
  },
  {
    id: "sp7",
    name: "PlanetScale",
    tier: "silver",
    logo: "https://logo.clearbit.com/planetscale.com",
    website: "https://planetscale.com",
    description:
      "PlanetScale is the world's most advanced MySQL-compatible serverless database platform.",
  },
];

export const VENUE: Venue = {
  name: "Moscone Center West",
  address: "747 Howard St",
  city: "San Francisco, CA 94103",
  mapsUrl: "https://maps.google.com/?q=Moscone+Center+West+San+Francisco",
  parkingInfo:
    "Paid parking available at the 5th & Mission Garage (750 Mission St) and the Moscone Center Garage. Rates from $25/day. BART accessible from Powell St and Civic Center stations.",
  wifiNetwork: "DevSummit2026",
  wifiPassword: "dev2026!",
  rooms: [
    {
      id: "r1",
      name: "Main Stage",
      capacity: 2000,
      floor: "Level 1",
      features: ["Live streaming", "Q&A mics", "Live captions"],
    },
    {
      id: "r2",
      name: "Hall A",
      capacity: 400,
      floor: "Level 2",
      features: ["Breakout seating", "Whiteboards"],
    },
    {
      id: "r3",
      name: "Hall B",
      capacity: 400,
      floor: "Level 2",
      features: ["Breakout seating", "Power outlets"],
    },
    {
      id: "r4",
      name: "Workshop Room 1",
      capacity: 40,
      floor: "Level 3",
      features: ["Hands-on tables", "Power at every seat", "Fast WiFi"],
    },
    {
      id: "r5",
      name: "Workshop Room 2",
      capacity: 40,
      floor: "Level 3",
      features: ["Hands-on tables", "Power at every seat"],
    },
  ],
};

export const UPDATES: Update[] = [
  {
    id: "u1",
    title: "Welcome to DevSummit 2026!",
    body: "Doors are now open. Pick up your badge at Registration on Level 1. The morning keynote starts at 9:00 AM on the Main Stage. Grab coffee at the sponsors' lounge on your way in.",
    timestamp: "2026-09-14T07:30:00Z",
    type: "announcement",
  },
  {
    id: "u2",
    title: "Workshop: Limited Spots Remaining",
    body: "The CRDT Workshop with Priya Nair (Day 2, 10:00 AM) has only 6 seats left. Sign up at the registration desk to claim your spot.",
    timestamp: "2026-09-14T08:45:00Z",
    type: "alert",
  },
  {
    id: "u3",
    title: "Lunch Area Change",
    body: "Due to increased attendance, lunch on Day 1 will be served on both Level 1 (Expo Hall) and Level 2 (Hall A Foyer). Doors open at 12:15 PM.",
    timestamp: "2026-09-14T11:00:00Z",
    type: "schedule",
  },
  {
    id: "u4",
    title: "Speaker Q&A: Elena Vasquez",
    body: "Elena Vasquez will host an extended Q&A in Hall B immediately after her session on AI Code Generation. Don't miss the chance to ask your questions in person.",
    timestamp: "2026-09-14T14:00:00Z",
    type: "info",
  },
  {
    id: "u5",
    title: "Evening Networking: Rooftop Lounge",
    body: "Tonight's networking event moves to the rooftop lounge of the Hotel Zephyr (Pier 39). Shuttle service available from Moscone Center at 6 PM, 6:30 PM, and 7 PM.",
    timestamp: "2026-09-14T15:30:00Z",
    type: "announcement",
  },
];

export const FAQ: FaqItem[] = [
  {
    id: "f1",
    question: "What is included in my conference ticket?",
    answer:
      "Your ticket includes access to all keynote sessions, breakout talks, and the expo hall for the duration of the conference. Lunch and coffee breaks are provided daily. Evening networking events are also included.",
    category: "General",
  },
  {
    id: "f2",
    question: "Will sessions be recorded?",
    answer:
      "Yes — all Main Stage keynotes and the majority of track sessions will be recorded and made available on the DevSummit website within 2 weeks of the event.",
    category: "Sessions",
  },
  {
    id: "f3",
    question: "How do I sign up for workshops?",
    answer:
      "Workshops have limited capacity. You can reserve your spot at the Registration desk (Level 1) or via the app. Workshop reservations open on Day 1 at 8 AM.",
    category: "Sessions",
  },
  {
    id: "f4",
    question: "What's the WiFi password?",
    answer:
      "Network: DevSummit2026 — Password: dev2026! — Available throughout Moscone Center West.",
    category: "Venue",
  },
  {
    id: "f5",
    question: "Is the venue accessible?",
    answer:
      "Yes. Moscone Center West is fully ADA accessible, with elevators to all levels, accessible restrooms on every floor, and reserved seating in all session rooms. Contact the info desk for specific accommodation requests.",
    category: "Venue",
  },
  {
    id: "f6",
    question: "Can I get a refund?",
    answer:
      "Refunds are available up to 30 days before the event. After that, tickets can be transferred to another attendee. Contact support@devsummit.io for assistance.",
    category: "Registration",
  },
  {
    id: "f7",
    question: "Are there quiet/lactation rooms?",
    answer:
      "Yes — a quiet room and a lactation room are both available on Level 2. Ask any staff member for directions.",
    category: "Venue",
  },
  {
    id: "f8",
    question: "How do I become a speaker next year?",
    answer:
      "Our CFP (Call for Papers) opens in January each year. Follow @DevSummit on Twitter or sign up for our mailing list to be notified when submissions open.",
    category: "General",
  },
];

export function getSessionById(id: string): Session | undefined {
  return SESSIONS.find((s) => s.id === id);
}

export function getSpeakerById(id: string): Speaker | undefined {
  return SPEAKERS.find((s) => s.id === id);
}

export function getSpeakersForSession(session: Session): Speaker[] {
  return session.speakerIds
    .map((id) => getSpeakerById(id))
    .filter(Boolean) as Speaker[];
}

export function getSessionsForSpeaker(speaker: Speaker): Session[] {
  return speaker.sessionIds
    .map((id) => getSessionById(id))
    .filter(Boolean) as Session[];
}

export function getSessionsByDay(): Record<string, Session[]> {
  const result: Record<string, Session[]> = {};
  for (const session of SESSIONS) {
    if (!result[session.day]) result[session.day] = [];
    result[session.day].push(session);
  }
  return result;
}
