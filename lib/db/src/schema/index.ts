import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

export const congressBooths = pgTable("congress_booths", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  boothNumber: varchar("booth_number", { length: 50 }),
  description: text("description"),
  secretToken: varchar("secret_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const congressAttendees = pgTable("congress_attendees", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  emailConsent: boolean("email_consent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const congressBoothVisits = pgTable(
  "congress_booth_visits",
  {
    id: serial("id").primaryKey(),
    boothId: integer("booth_id").references(() => congressBooths.id, {
      onDelete: "cascade",
    }),
    attendeeId: integer("attendee_id").references(() => congressAttendees.id, {
      onDelete: "cascade",
    }),
    deviceId: varchar("device_id", { length: 255 }),
    attendeeName: varchar("attendee_name", { length: 255 }),
    attendeeEmail: varchar("attendee_email", { length: 255 }),
    emailConsent: boolean("email_consent").notNull().default(false),
    visitedAt: timestamp("visited_at").defaultNow(),
  },
  (table) => [unique("uq_booth_visits_booth_attendee").on(table.boothId, table.attendeeId)]
);

export const congressCheckinNonces = pgTable("congress_checkin_nonces", {
  nonce: varchar("nonce", { length: 64 }).primaryKey(),
  attendeeId: integer("attendee_id")
    .notNull()
    .references(() => congressAttendees.id, { onDelete: "cascade" }),
  boothId: integer("booth_id")
    .notNull()
    .references(() => congressBooths.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

export const congressBoothScanCodes = pgTable("congress_booth_scan_codes", {
  code: varchar("code", { length: 64 }).primaryKey(),
  boothId: integer("booth_id")
    .notNull()
    .references(() => congressBooths.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const congressRegistrationRate = pgTable(
  "congress_registration_rate",
  {
    ip: varchar("ip", { length: 64 }).notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.ip, table.windowStart] })]
);

export const congressPhotos = pgTable("congress_photos", {
  id: text("id").primaryKey(),
  objectPath: text("object_path").notNull(),
  uploaderName: text("uploader_name").notNull(),
  uploaderDeviceId: text("uploader_device_id").notNull(),
  caption: text("caption").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const congressPhotoLikes = pgTable(
  "congress_photo_likes",
  {
    photoId: text("photo_id")
      .notNull()
      .references(() => congressPhotos.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.photoId, table.deviceId] })]
);

export const congressPushTokens = pgTable("congress_push_tokens", {
  token: text("token").primaryKey(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
});

export const congressScheduledAnnouncements = pgTable(
  "congress_scheduled_announcements",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    scheduledFor: timestamp("scheduled_for").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  }
);
