export interface SeedSpeaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  photoUrl: string;
  sessionIds: string[];
}

export interface SeedSession {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  day: string;
  room: string;
  track: string;
  speakerIds: string[];
  tags: string[];
  isPara: boolean;
}

export interface SeedSponsor {
  id: string;
  name: string;
  tier: string;
  website: string;
  logoUrl: string;
  description: string;
}

export const SEED_SPEAKERS: SeedSpeaker[] = [
  {
    id: "s1",
    name: "Christopher Borgman, OD, FAAO",
    title: "Associate Professor",
    company: "Southern College of Optometry, Memphis, TN",
    bio: "Dr. Chris Borgman is an associate professor at the Southern College of Optometry in Memphis, TN. He earned his O.D. degree from the Illinois College of Optometry then completed a one-year residency in Primary Care and Ocular Disease at the Illinois Eye Institute in Chicago, Illinois.",
    photoUrl: "https://i.pravatar.cc/300?img=51",
    sessionIds: ["d1", "d2", "d3"],
  },
  {
    id: "s2",
    name: "Angelica Echiverri, OD, MS",
    title: "Assistant Professor",
    company: "RMUoHP College of Optometric Medicine",
    bio: "Dr. Angelica Echiverri graduated with a dual OD/MS degree from the University of Houston College of Optometry. She completed a residency in Ocular Disease at Bascom Palmer Eye Institute in Miami, FL.",
    photoUrl: "https://i.pravatar.cc/300?img=47",
    sessionIds: ["d4", "d5", "d6"],
  },
  {
    id: "s3",
    name: "Kyle Klute, OD",
    title: "Primary Care Optometrist",
    company: "Ocular Disease Specialist",
    bio: "Dr. Kyle Klute received his optometry degree from Illinois College of Optometry in Chicago and then completed additional training at a Veterans Medical Center in Battle Creek, Michigan.",
    photoUrl: "https://i.pravatar.cc/300?img=12",
    sessionIds: ["d7", "d8", "d9", "d10"],
  },
  {
    id: "s4",
    name: "Tamara Petrosyan, OD",
    title: "Associate Clinical Professor",
    company: "SUNY Optometry & NY Health and Hospitals",
    bio: "Dr. Tamara Petrosyan is an associate clinical professor at SUNY Optometry and New York Health and Hospitals in the Primary Care, Ocular Disease, Pediatrics, and Vision Therapy departments.",
    photoUrl: "https://i.pravatar.cc/300?img=23",
    sessionIds: ["d11", "d12", "d13", "p-fri-pm1", "p-fri-pm3"],
  },
  {
    id: "s5",
    name: "Jarrod Davies, OD, FCOVD",
    title: "Clinical Director",
    company: "Utah Vision Development Center, South Jordan, UT",
    bio: "Dr. Jarrod Davies currently practices in South Jordan, Utah as the clinical director of Utah Vision Development Center. He specializes in vision rehabilitation and sports vision performance training.",
    photoUrl: "https://i.pravatar.cc/300?img=33",
    sessionIds: ["d14", "p-fri-pm2"],
  },
  {
    id: "s6",
    name: "Kassaundra Johnston, OD",
    title: "Optometrist",
    company: "Private Practice, Colorado Springs, CO",
    bio: "Dr. Kassaundra Johnston received her Doctor of Optometry degree from the University of Houston College of Optometry, where she completed a residency in Neuro-optometric Rehabilitation.",
    photoUrl: "https://i.pravatar.cc/300?img=9",
    sessionIds: ["d15", "d16", "d17"],
  },
  {
    id: "s7",
    name: "Mile Brujic, OD, FAAO",
    title: "Partner",
    company: "Premier Vision Group, Northwest Ohio",
    bio: "Dr. Brujic is a partner of Premier Vision Group, a successful three-location optometric practice in Northwest Ohio. He has published over 200 articles and given over 1,000 lectures nationally and internationally.",
    photoUrl: "https://i.pravatar.cc/300?img=68",
    sessionIds: ["d19", "d20", "d21", "d22", "d23", "p1", "p1b", "p1c", "p1d", "p5", "p6"],
  },
  {
    id: "s8",
    name: "Aubri StClair",
    title: "Para Optometric Educator",
    company: "Utah Optometric Association",
    bio: "Aubri StClair is a featured paraoptometric educator presenting at the 2026 UOA Annual Congress. Her four-course Saturday track covers multiple pair dispensing, work-life balance, lens tints and photochromics, and advanced lens knowledge.",
    photoUrl: "https://i.pravatar.cc/300?img=56",
    sessionIds: ["p7", "p8", "p9", "p10"],
  },
  {
    id: "s9",
    name: "Anne Mika Moy, OD",
    title: "Associate Dean for Admissions & Student Affairs",
    company: "UC Berkeley Optometry",
    bio: "Dr. Mika Moy graduated from the Herbert Wertheim School of Optometry and Vision Science at UC Berkeley and completed a residency in Pediatrics and Cornea/Contact Lenses there.",
    photoUrl: "https://i.pravatar.cc/300?img=44",
    sessionIds: ["d24", "d25", "d26", "d27"],
  },
];

export const SEED_DOC_SESSIONS: SeedSession[] = [
  { id: "dm-thu-lunch", title: "Lunch sponsored by MacuHealth (RSVP only)", description: "Sponsored lunch for registered attendees. RSVP required. Hosted at the Remington Hall restaurant.", startTime: "11:30 AM", endTime: "12:30 PM", day: "Thu, June 4", room: "Remington Hall Restaurant", track: "Meal / Social", speakerIds: [], tags: ["lunch", "sponsored"], isPara: false },
  { id: "dm-thu-evening", title: "Kickoff Reception sponsored by The Eye Institute", description: "Join us for the official congress kickoff reception, sponsored by The Eye Institute of Utah.", startTime: "7:00 PM", endTime: "9:00 PM", day: "Thu, June 4", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["reception", "social"], isPara: false },
  { id: "dm-thu-meeting", title: "UOA Business Meeting", description: "Utah Optometric Association Annual Business Meeting.", startTime: "6:00 PM", endTime: "7:00 PM", day: "Thu, June 4", room: "Strawberry Conference Room", track: "Meal / Social", speakerIds: [], tags: ["business meeting"], isPara: false },
  { id: "dm-fri-breakfast", title: "Promotional Light Breakfast sponsored by Dompé", description: "Light breakfast for ODs and Paras, sponsored by Dompé.", startTime: "7:30 AM", endTime: "8:00 AM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Meal / Social", speakerIds: [], tags: ["breakfast", "sponsored"], isPara: false },
  { id: "dm-fri-lunch", title: "Installation Lunch sponsored by Hoopes Vision", description: "Annual installation lunch recognizing incoming UOA leadership, sponsored by Hoopes Vision.", startTime: "12:00 PM", endTime: "1:30 PM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["lunch", "installation"], isPara: false },
  { id: "dm-fri-exhibit", title: "Exhibit Hall", description: "Open to optometrists, office staff, and optometry students. Visit sponsor booths and scan QR codes.", startTime: "1:30 PM", endTime: "4:00 PM", day: "Fri, June 5", room: "Jordanelle Ballroom", track: "Meal / Social", speakerIds: [], tags: ["exhibit hall"], isPara: false },
  { id: "dm-fri-dinner", title: "Dinner sponsored by VSP (adults only, VSP workshop)", description: "Dinner event sponsored by VSP Vision. Adults only. Includes a VSP workshop.", startTime: "7:00 PM", endTime: "9:00 PM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["dinner", "sponsored", "VSP"], isPara: false },
  { id: "d1", title: "OCT Grand Rounds", description: "This course will review and discuss several unique grand rounds cases where optical coherence tomography (OCT) was used as the main diagnostic technology.", startTime: "1:00 PM", endTime: "2:00 PM", day: "Thu, June 4", room: "Strawberry Conference Room", track: "Retinal Disease", speakerIds: ["s1"], tags: ["OCT", "imaging"], isPara: false },
  { id: "d2", title: "Neuro, Optic Nerve & Orbit Brainteaser Cases", description: "This course will highlight 9 neuro-optometry cases that the author has managed to increase his knowledge in the neuro-optometry realm of eye care.", startTime: "2:00 PM", endTime: "4:00 PM", day: "Thu, June 4", room: "Strawberry Conference Room", track: "Neuro-Optometry", speakerIds: ["s1"], tags: ["neuro", "optic nerve"], isPara: false },
  { id: "d3", title: "Retina Brainteaser Cases", description: "This course will review and discuss the pathology behind approximately a dozen retinal pathology cases not seen in optometry every day.", startTime: "7:00 AM", endTime: "9:00 AM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Retinal Disease", speakerIds: ["s1"], tags: ["retina", "pathology"], isPara: false },
  { id: "d4", title: "Diagnosing and Managing Glaucoma in High Myopes", description: "High myopia can often present a challenge in the diagnosis and management of glaucoma. This lecture will discuss confounding characteristics shared between high myopia and glaucoma.", startTime: "4:00 PM", endTime: "5:00 PM", day: "Thu, June 4", room: "Strawberry Conference Room", track: "Glaucoma", speakerIds: ["s2"], tags: ["glaucoma", "myopia"], isPara: false },
  { id: "d5", title: "Crash Course in Retina OCT and OCT-A", description: "Optical coherence tomography (OCT) and OCT-A are important instruments in the diagnosis and management of retinal disease.", startTime: "5:00 PM", endTime: "6:00 PM", day: "Thu, June 4", room: "Strawberry Conference Room", track: "Retinal Disease", speakerIds: ["s2"], tags: ["OCT", "retina"], isPara: false },
  { id: "d6", title: "Ocular Pharmacology: New Ideas, New Uses, Old Drugs & Old Topics", description: "The field of ocular and systemic pharmacology is changing all the time. This lecture provides a review of interesting old and new drugs with exposure in optometric practice.", startTime: "9:00 AM", endTime: "11:00 AM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Pharmacology", speakerIds: ["s2"], tags: ["pharmacology", "drugs"], isPara: false },
  { id: "d7", title: "Choose the Code: Mastering E/M and Ophthalmic Coding", description: "Accurate coding is one of the most powerful and most misunderstood levers in primary care optometry. This two-hour course provides a practical, case-driven framework.", startTime: "8:00 AM", endTime: "10:00 AM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Practice Management", speakerIds: ["s3"], tags: ["coding", "billing"], isPara: false },
  { id: "d8", title: "Using KPIs to Grow Medical Optometry", description: "Optometry stands at a crossroads: demand for medical eye care is rising sharply. This course explores how Key Performance Indicators can serve as benchmarks for growth.", startTime: "10:00 AM", endTime: "11:00 AM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Practice Management", speakerIds: ["s3"], tags: ["KPIs", "growth"], isPara: false },
  { id: "d9", title: "AI for Optometrists: Using AI Without Losing Your Clinical Mind", description: "Artificial intelligence is rapidly entering optometric practice. Using Evidence-Based Medicine as the organizing framework, this course examines where AI genuinely enhances clinical decision-making.", startTime: "11:00 AM", endTime: "12:00 PM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Practice Management", speakerIds: ["s3"], tags: ["AI", "technology"], isPara: false },
  { id: "d10", title: "Glaucoma Management in Primary Eye Care", description: "This course equips primary care optometrists with a systematic blueprint for diagnosing, staging, and managing glaucoma.", startTime: "10:30 AM", endTime: "11:30 AM", day: "Sat, June 6", room: "Strawberry Conference Room", track: "Glaucoma", speakerIds: ["s3"], tags: ["glaucoma", "management"], isPara: false },
  { id: "d11", title: "Shifting Paradigms: Evidence-Based Binocular Treatment of Amblyopia", description: "This lecture provides optometrists with an in-depth exploration of amblyopia as a binocular vision dysfunction, emphasizing evidence-based treatments.", startTime: "8:00 AM", endTime: "9:00 AM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Pediatrics & BV", speakerIds: ["s4"], tags: ["amblyopia", "binocular vision"], isPara: false },
  { id: "d12", title: "From Impact to Impairment: Acquired Brain Injury", description: "This lecture delves into the intricate web of causes contributing to acquired brain injury (ABI), including primary and secondary head injury.", startTime: "9:00 AM", endTime: "10:00 AM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Neuro-Optometry", speakerIds: ["s4"], tags: ["TBI", "brain injury"], isPara: false },
  { id: "d13", title: "From Spit-up to Stereopsis: Infant Eye Exams Workshop", description: "This comprehensive workshop offers an essential foundation for conducting pediatric eye examinations, from infants and beyond.", startTime: "11:00 AM", endTime: "12:00 PM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Pediatrics & BV", speakerIds: ["s4", "s5"], tags: ["pediatrics", "infants"], isPara: false },
  { id: "d14", title: "Seeing the Impact: Concussion Assessment in Optometric Practice", description: "Concussion is a frequently overlooked neurological injury that often presents with visually mediated symptoms in primary eye care.", startTime: "10:00 AM", endTime: "11:00 AM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Neuro-Optometry", speakerIds: ["s5"], tags: ["concussion", "TBI"], isPara: false },
  { id: "d15", title: "Common Questions in Pediatric Eye Care", description: "Case discussions that integrate common questions and referrals in a pediatric eye exam.", startTime: "4:00 PM", endTime: "6:00 PM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Pediatrics & BV", speakerIds: ["s6"], tags: ["pediatrics", "prescribing"], isPara: false },
  { id: "d16", title: "BV Brainteasers", description: "Complex cases that take a little extra thought to come to a diagnosis or treatment options.", startTime: "6:00 PM", endTime: "7:00 PM", day: "Fri, June 5", room: "Dutch Conference Room", track: "Pediatrics & BV", speakerIds: ["s6"], tags: ["binocular vision"], isPara: false },
  { id: "d17", title: "Prescribing Prism in Any Practice Setting", description: "Case discussions that integrate different approaches to prescribing prism.", startTime: "8:30 AM", endTime: "10:30 AM", day: "Sat, June 6", room: "Strawberry Conference Room", track: "Pediatrics & BV", speakerIds: ["s6"], tags: ["prism", "prescribing"], isPara: false },
  { id: "d18", title: "The Self-Aware Practice: Building a Healthy Practice Culture", description: "This course teaches optometrists how to best implement personality assessments to create organizational health.", startTime: "11:30 AM", endTime: "12:30 PM", day: "Sat, June 6", room: "Strawberry Conference Room", track: "Practice Management", speakerIds: ["s3"], tags: ["culture", "leadership"], isPara: false },
  { id: "d19", title: "OCT for the Anterior Segment", description: "OCT is commonly utilized for posterior segment disease. This course will explore clinical utilization for anterior segment OCT.", startTime: "4:00 PM", endTime: "5:00 PM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Topical Diagnosis", speakerIds: ["s7"], tags: ["OCT", "anterior segment"], isPara: false },
  { id: "d20", title: "The Truth About Presbyopia Drops: Evidence-Based Cases and Myth-Busting Insights", description: "This course will discuss the unmet need in the presbyopic population and pharmaceutical agents being leveraged.", startTime: "5:00 PM", endTime: "6:00 PM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Pharmacology", speakerIds: ["s7"], tags: ["presbyopia", "pharmacology"], isPara: false },
  { id: "d21", title: "Innovative Ways to Generate Revenue", description: "This course explores innovative revenue strategies that elevate both patient outcomes and practice performance.", startTime: "6:00 PM", endTime: "7:00 PM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Practice Management", speakerIds: ["s7"], tags: ["revenue", "practice management"], isPara: false },
  { id: "d22", title: "Twelve Innovations in Eye Care That You Need to Know About", description: "Eye care is experiencing rapid innovations which will improve patient care. This course will review new diagnostics and therapeutics.", startTime: "8:30 AM", endTime: "10:30 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Ocular Disease", speakerIds: ["s7"], tags: ["innovations", "technology"], isPara: false },
  { id: "d23", title: "Rule These Out Before You Diagnose It As Dry Eye", description: "There are several conditions that can mimic dry eye. This course will discuss those conditions that need to be ruled out first.", startTime: "10:30 AM", endTime: "11:30 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Topical Diagnosis", speakerIds: ["s7"], tags: ["dry eye", "differential diagnosis"], isPara: false },
  { id: "d24", title: "Ocular Pain Management: New Philosophies and Regulations", description: "Pain is both an emotional and sensory experience. Changing philosophies of pain management will be discussed.", startTime: "4:00 PM", endTime: "5:00 PM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Pharmacology", speakerIds: ["s9"], tags: ["pain management", "pharmacology"], isPara: false },
  { id: "d25", title: "Visual Field Defects: Looking Beyond Glaucoma", description: "Visual fields are an important diagnostic tool. Three cases are presented where screening VF were key in finding underlying disease.", startTime: "8:00 AM", endTime: "9:00 AM", day: "Sun, June 7", room: "Strawberry Conference Room", track: "Glaucoma", speakerIds: ["s9"], tags: ["visual fields", "glaucoma"], isPara: false },
  { id: "d26", title: "Painless Shingles and the Zoster of Tomorrow", description: "About 1/3 of people are afflicted with Herpes Zoster at some point in their life. This lecture will go over the history and emerging data.", startTime: "9:00 AM", endTime: "10:00 AM", day: "Sun, June 7", room: "Strawberry Conference Room", track: "Systemic Disease", speakerIds: ["s9"], tags: ["shingles", "herpes zoster"], isPara: false },
  { id: "d27", title: "Mystery to Mastery: Anterior Segment Puzzles", description: "The following cases provide the clinician with useful tools to aid in the diagnosis and management of anterior segment disease.", startTime: "10:00 AM", endTime: "12:00 PM", day: "Sun, June 7", room: "Strawberry Conference Room", track: "Topical Diagnosis", speakerIds: ["s9"], tags: ["anterior segment", "case studies"], isPara: false },
  { id: "dm-sat-breakfast", title: "Breakfast Challenge of the Clinics sponsored by Waite Vision", description: "Morning breakfast sponsored by Waite Vision featuring the 'Challenge of the Clinics' interactive format.", startTime: "7:00 AM", endTime: "8:00 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["breakfast", "sponsored"], isPara: false },
  { id: "dm-sat-lunch", title: "Sponsored Symposium Lunch — ODs only ($100 Visa Gift Card)", description: "Sponsored lunch for ODs, including a $100 Visa gift card giveaway. ODs only event.", startTime: "12:30 PM", endTime: "2:00 PM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["lunch", "sponsored"], isPara: false },
  { id: "dm-sat-exhibit", title: "Exhibit Hall with Raffle Drawing at 3:30 PM", description: "Exhibit Hall open to all attendees. Sponsor booths, passport prize drawings. Raffle drawing at 3:30 PM.", startTime: "2:00 PM", endTime: "4:00 PM", day: "Sat, June 6", room: "Jordanelle Ballroom", track: "Meal / Social", speakerIds: [], tags: ["exhibit hall", "raffle"], isPara: false },
  { id: "dm-sat-family-social", title: "Family Social: Scales and Tails", description: "Family-friendly event featuring a live reptile show and prizes for the whole family.", startTime: "4:00 PM", endTime: "6:00 PM", day: "Sat, June 6", room: "Hailstone Terrace", track: "Meal / Social", speakerIds: [], tags: ["family", "social"], isPara: false },
  { id: "dm-sat-networking", title: "OD & Student Career Networking Social (Speed Networking)", description: "Speed networking event for optometrists and optometry students.", startTime: "5:00 PM", endTime: "6:30 PM", day: "Sat, June 6", room: "Empire Conference Room", track: "Meal / Social", speakerIds: [], tags: ["networking", "students"], isPara: false },
  { id: "dm-sat-carnival", title: "Family Carnival sponsored by Utah Eye Centers", description: "A fun family carnival to close out Saturday evening, sponsored by Utah Eye Centers.", startTime: "6:30 PM", endTime: "9:00 PM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["carnival", "family"], isPara: false },
  { id: "dm-sun-breakfast", title: "Breakfast sponsored by Bausch + Lomb", description: "Morning breakfast sponsored by Bausch + Lomb to start the final day.", startTime: "7:30 AM", endTime: "8:00 AM", day: "Sun, June 7", room: "Strawberry Conference Room", track: "Meal / Social", speakerIds: [], tags: ["breakfast", "sponsored"], isPara: false },
  { id: "dm-sun-adjournment", title: "Congress Adjournment", description: "Official close of the 2026 UOA Annual Congress. Thank you for attending!", startTime: "12:00 PM", endTime: "12:00 PM", day: "Sun, June 7", room: "—", track: "Meal / Social", speakerIds: [], tags: ["adjournment"], isPara: false },
];

export const SEED_PARA_SESSIONS: SeedSession[] = [
  { id: "dm-thu-lunch", title: "Lunch sponsored by MacuHealth (RSVP only)", description: "Sponsored lunch for registered attendees. RSVP required.", startTime: "11:30 AM", endTime: "12:30 PM", day: "Thu, June 4", room: "Remington Hall Restaurant", track: "Meal / Social", speakerIds: [], tags: ["lunch", "sponsored"], isPara: true },
  { id: "dm-thu-evening", title: "Kickoff Reception sponsored by The Eye Institute", description: "The official congress kickoff reception.", startTime: "7:00 PM", endTime: "9:00 PM", day: "Thu, June 4", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["reception"], isPara: true },
  { id: "dm-fri-breakfast", title: "Promotional Light Breakfast sponsored by Dompé", description: "Light breakfast for ODs and Paras, sponsored by Dompé.", startTime: "7:30 AM", endTime: "8:00 AM", day: "Fri, June 5", room: "Strawberry Conference Room", track: "Meal / Social", speakerIds: [], tags: ["breakfast"], isPara: true },
  { id: "p1", title: "Multifocal Contacts: How They Work and How to Make Them Work (ABO/CPO)", description: "Multifocal contact lenses have highly advanced designs and are a remarkable option for presbyopes interested in minimizing their dependency on glasses.", startTime: "8:00 AM", endTime: "9:00 AM", day: "Fri, June 5", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s7"], tags: ["multifocal", "contact lenses", "ABO", "CPO"], isPara: true },
  { id: "p1b", title: "Eliminating the Stigma From Astigmatism (ABO/CPO)", description: "Astigmatic refractive errors can be some of the most difficult but most rewarding contact lens fittings.", startTime: "9:00 AM", endTime: "10:00 AM", day: "Fri, June 5", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s7"], tags: ["astigmatism", "toric", "ABO", "CPO"], isPara: true },
  { id: "p1c", title: "Eye Know What Those Drops are For! (ABO/CPO)", description: "This course reviews the major drops used in today's practice, teaching paraoptometrics the different classes and types of drops.", startTime: "10:00 AM", endTime: "11:00 AM", day: "Fri, June 5", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s7"], tags: ["eye drops", "pharmacology", "ABO", "CPO"], isPara: true },
  { id: "p1d", title: "The Retina You See With the OCT (ABO/CPO)", description: "The OCT has revolutionized the way we view the retina. This course will discuss the what and why of OCT scans.", startTime: "11:00 AM", endTime: "12:00 PM", day: "Fri, June 5", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s7"], tags: ["OCT", "retina", "ABO", "CPO"], isPara: true },
  { id: "dm-fri-lunch", title: "Installation Lunch sponsored by Hoopes Vision", description: "Annual installation lunch recognizing incoming UOA leadership.", startTime: "12:00 PM", endTime: "1:30 PM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["lunch", "installation"], isPara: true },
  { id: "dm-fri-exhibit", title: "Exhibit Hall", description: "Open to optometrists, office staff, and optometry students. Lanyards required for entry.", startTime: "1:30 PM", endTime: "4:00 PM", day: "Fri, June 5", room: "Jordanelle Ballroom", track: "Meal / Social", speakerIds: [], tags: ["exhibit hall"], isPara: true },
  { id: "p-fri-pm1", title: "Peek-A-Boo: Tips and Tricks for Infant Eye Exams (CPO only)", description: "Infants present unique challenges in optometric practice. This course covers practical techniques and tips for effectively examining infants.", startTime: "4:00 PM", endTime: "5:00 PM", day: "Fri, June 5", room: "Empire Conference Room", track: "CPO", speakerIds: ["s4"], tags: ["pediatrics", "infant", "CPO"], isPara: true },
  { id: "p-fri-pm2", title: "Front-Line Focus: The Paraoptometric's Role in Myopia Management (CPO only)", description: "Myopia management is a growing focus in modern optometric practice. This course empowers paras with knowledge of myopia progression.", startTime: "5:00 PM", endTime: "6:00 PM", day: "Fri, June 5", room: "Empire Conference Room", track: "CPO", speakerIds: ["s5"], tags: ["myopia management", "CPO"], isPara: true },
  { id: "p-fri-pm3", title: "Introduction to Vision Therapy Treatment (CPO only)", description: "Vision therapy is a rapidly growing area of optometric care. This course provides an introduction to vision therapy.", startTime: "6:00 PM", endTime: "7:00 PM", day: "Fri, June 5", room: "Empire Conference Room", track: "CPO", speakerIds: ["s4"], tags: ["vision therapy", "CPO"], isPara: true },
  { id: "pm-fri-dinner", title: "Dinner sponsored by VSP (adults only)", description: "Evening dinner sponsored by VSP Vision. Adults only.", startTime: "7:00 PM", endTime: "9:00 PM", day: "Fri, June 5", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["dinner", "sponsored"], isPara: true },
  { id: "dm-sat-breakfast", title: "Breakfast Challenge of the Clinics sponsored by Waite Vision", description: "Morning breakfast sponsored by Waite Vision.", startTime: "7:00 AM", endTime: "8:00 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["breakfast"], isPara: true },
  { id: "p5", title: "Twelve Innovations in Eye Care That You Need to Know (CPO only)", description: "Eye care is experiencing rapid innovation. This course will review new diagnostics and therapeutics.", startTime: "8:30 AM", endTime: "10:30 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "CPO", speakerIds: ["s7"], tags: ["innovations", "CPO"], isPara: true },
  { id: "p6", title: "Rule These Out Before You DX Dry Eye (CPO only)", description: "Several conditions can mimic dry eye — this course discusses what needs to be ruled out first.", startTime: "10:30 AM", endTime: "11:30 AM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "CPO", speakerIds: ["s7"], tags: ["dry eye", "CPO"], isPara: true },
  { id: "p7", title: "Multiple Pair: The Magic Number (ABO/CPO)", description: "This course explores the power of multiple pair dispensing and why it's one of the most impactful strategies in optical practice.", startTime: "8:30 AM", endTime: "9:30 AM", day: "Sat, June 6", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s8"], tags: ["multiple pair", "dispensing", "ABO", "CPO"], isPara: true },
  { id: "p8", title: "Healthy Work Life: You are your #1 Asset (ABO/CPO)", description: "Paraoptometrics are the backbone of a successful practice. This course explores strategies for maintaining a healthy work-life balance.", startTime: "9:30 AM", endTime: "10:30 AM", day: "Sat, June 6", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s8"], tags: ["work-life balance", "ABO", "CPO"], isPara: true },
  { id: "p9", title: "True Colors: Tints, Polarization, and Photochromic Lenses (ABO/CPO)", description: "Lens tints, polarized lenses, and photochromic technology can dramatically improve patient satisfaction.", startTime: "10:30 AM", endTime: "11:30 AM", day: "Sat, June 6", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s8"], tags: ["lens tints", "polarization", "ABO", "CPO"], isPara: true },
  { id: "p10", title: "The More You Know About Lenses: Being Well-Rounded (ABO/CPO)", description: "A well-rounded knowledge of lens options makes paras more effective consultants for patients.", startTime: "11:30 AM", endTime: "12:30 PM", day: "Sat, June 6", room: "Empire Conference Room", track: "ABO/CPO", speakerIds: ["s8"], tags: ["lenses", "optics", "ABO", "CPO"], isPara: true },
  { id: "pm-sat-para-social", title: "Para Social sponsored by Hoopes Vision (with appetizers)", description: "A dedicated social event for paraoptometrics, sponsored by Hoopes Vision.", startTime: "12:30 PM", endTime: "1:30 PM", day: "Sat, June 6", room: "Empire Conference Room", track: "Meal / Social", speakerIds: [], tags: ["para social", "networking"], isPara: true },
  { id: "dm-sat-exhibit", title: "Exhibit Hall with Raffle Drawing at 3:30 PM", description: "Exhibit Hall open to all attendees including paras. Raffle drawing at 3:30 PM.", startTime: "2:00 PM", endTime: "4:00 PM", day: "Sat, June 6", room: "Jordanelle Ballroom", track: "Meal / Social", speakerIds: [], tags: ["exhibit hall", "raffle"], isPara: true },
  { id: "dm-sat-family-social", title: "Family Social: Scales and Tails", description: "Family-friendly event featuring a live reptile show and prizes.", startTime: "4:00 PM", endTime: "6:00 PM", day: "Sat, June 6", room: "Hailstone Terrace", track: "Meal / Social", speakerIds: [], tags: ["family", "social"], isPara: true },
  { id: "dm-sat-carnival", title: "Family Carnival sponsored by Utah Eye Centers", description: "Evening family carnival sponsored by Utah Eye Centers.", startTime: "6:30 PM", endTime: "9:00 PM", day: "Sat, June 6", room: "Deer Creek Ballroom", track: "Meal / Social", speakerIds: [], tags: ["carnival", "family"], isPara: true },
];

export const SEED_SPONSORS: SeedSponsor[] = [
  { id: "sp1", name: "Waite Vision", tier: "platinum", website: "https://www.waitevision.com", logoUrl: "https://utaheyedoc.org/photos/Waite_Vision_Logo_09162023084920.PNG", description: "Waite Vision is the premier vision correction center utilizing the most advanced technology and surgical techniques." },
  { id: "sp2", name: "The Eye Institute of Utah", tier: "platinum", website: "https://theeyeinstitute.com", logoUrl: "https://utaheyedoc.org/photos/The_Eye_Institue_Logo_09162023085926.JPG", description: "Known throughout the Intermountain West as a leader in eye care, The Eye Institute of Utah specializes in cataract surgery, LASIK, and more." },
  { id: "sp3", name: "VSP Vision", tier: "platinum", website: "https://www.vspproviderhub.com", logoUrl: "https://utaheyedoc.org/photos/VSP_Vision_Logotype_RGB_02262024083642.PNG", description: "VSP Vision's business is helping you with yours, so you can focus on what you do best: providing high-quality eye care to your patients." },
  { id: "sp4", name: "Hoopes Vision", tier: "platinum", website: "https://www.hoopesvision.com", logoUrl: "https://utaheyedoc.org/photos/Hoopes_Logo_09162023084752.PNG", description: "Hoopes Vision is a leading surgical facility providing the newest, safest, and most innovative vision correction technology." },
  { id: "sp5", name: "Utah Eye Centers", tier: "platinum", website: "https://www.utaheyecenters.com", logoUrl: "https://utaheyedoc.org/photos/Utah_Eye_Centers_Logo_09162023085541.PNG", description: "Utah Eye Centers' foremost goal is to ensure your eyes are healthy, combining expertise and state-of-the-art technology." },
  { id: "sp6", name: "Bausch + Lomb", tier: "gold", website: "https://www.bausch.com", logoUrl: "https://utaheyedoc.org/photos/Bausch_Logo_01082024072344.PNG", description: "Bausch + Lomb's mission is simple: helping you see better to live better all over the world." },
  { id: "sp7", name: "Glaukos", tier: "gold", website: "https://www.glaukos.com", logoUrl: "https://utaheyedoc.org/photos/glaukos-corporate-logo_01062025104805.JPG", description: "Glaukos pioneers novel, dropless platforms that advance the standard of care for patients suffering from sight-threatening diseases." },
  { id: "sp8", name: "Dompé", tier: "gold", website: "https://www.dompe.com", logoUrl: "https://utaheyedoc.org/photos/dompe-logo_01032024065142.JPG", description: "Dompé pushes the understanding of science and pursues R&D in new areas to positively impact patients living with unmet medical needs." },
  { id: "sp9", name: "MacuHealth", tier: "gold", website: "https://www.macuhealth.com", logoUrl: "https://utaheyedoc.org/photos/MacuHealth_Logo_09162023090314.PNG", description: "MacuHealth is setting a new standard for nutritional vision supplements, developing cutting-edge macular health vitamins." },
  { id: "sp10", name: "IT4EYES", tier: "gold", website: "https://stsutah.com", logoUrl: "https://utaheyedoc.org/photos/Screenshot_2024-03-26_at_5.48.56AM_03262024074916.JPG", description: "IT4EYES specializes in tailored IT solutions exclusively for optometrists." },
  { id: "sp11", name: "Johnson & Johnson Vision", tier: "gold", website: "https://www.jjvision.com", logoUrl: "https://utaheyedoc.org/photos/JJ_02262024085003.JPG", description: "Johnson & Johnson Vision is uniquely positioned to reimagine the future of eye health with an all-encompassing portfolio of solutions." },
  { id: "sp12", name: "EssilorLuxottica", tier: "gold", website: "https://www.essilorluxottica.com/en/", logoUrl: "https://utaheyedoc.org/photos/LOGO_ELEC-all_new_005_01302026163036.JPG", description: "EssilorLuxottica is a global leader in the design, manufacturing, and distribution of advanced vision care products." },
  { id: "sp13", name: "IDOC", tier: "silver", website: "https://idoc.net", logoUrl: "https://utaheyedoc.org/photos/idoc.logo.rgb.fullcolor_Utah_3_02122026155455.PNG", description: "IDOC is a quietly powerful ally for independent optometrists, with over 3,200 OD members throughout the U.S." },
  { id: "sp14", name: "LKC Technologies", tier: "silver", website: "https://lkc.com", logoUrl: "https://utaheyedoc.org/photos/cropped-cropped-LKC_logo_RGB_color_no_tagline_mini_400px_04172024151633.PNG", description: "LKC arms eye care professionals with innovative, accessible technology to assess retinal function." },
  { id: "sp15", name: "CooperVision", tier: "silver", website: "https://www.coopervision.com", logoUrl: "https://utaheyedoc.org/photos/CooperVision_01032024065824.JPG", description: "CooperVision is one of the world's leading manufacturers of soft contact lenses." },
  { id: "sp16", name: "LENZ Therapeutics", tier: "silver", website: "https://lenz-tx.com", logoUrl: "https://utaheyedoc.org/photos/LENZ_logo_01132026134605.JPG", description: "LENZ Therapeutics focuses on commercializing VIZZ™ (aceclidine ophthalmologic solution), the first FDA-approved aceclidine-based eye drop for presbyopia." },
  { id: "sp17", name: "Adit", tier: "silver", website: "https://adit.com", logoUrl: "https://utaheyedoc.org/photos/adit_logo_03042026115718.JPG", description: "Adit is the all-in-one AI-powered platform for faster practice growth." },
];
