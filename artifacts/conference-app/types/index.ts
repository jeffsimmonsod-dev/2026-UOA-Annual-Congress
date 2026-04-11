export interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  photo: string;
  sessionIds: string[];
  social?: {
    twitter?: string;
    linkedin?: string;
  };
}

export interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  day: string;
  room: string;
  track: string;
  speakerIds: string[];
  tags?: string[];
}

export interface Sponsor {
  id: string;
  name: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  logo: string;
  website: string;
  description: string;
  booth?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  features: string[];
}

export interface Venue {
  name: string;
  address: string;
  city: string;
  mapsUrl: string;
  parkingInfo: string;
  wifiNetwork: string;
  wifiPassword: string;
  rooms: Room[];
}

export interface Update {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: "announcement" | "schedule" | "info" | "alert";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}
