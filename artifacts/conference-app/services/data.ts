import type { Session, Speaker, Sponsor, Venue, Update, FaqItem } from "@/types";

export const CONFERENCE = {
  name: "2026 UOA Annual Congress",
  tagline: "Utah Optometric Association",
  dates: "June 4–7, 2026",
  location: "Grand Hyatt Deer Valley, Park City, UT",
  welcomeMessage:
    "Welcome to the 2026 UOA Annual Congress at the beautiful, brand-new Grand Hyatt Deer Valley Hotel in Park City, Utah! We have a wonderful, dynamic program planned — multi-track education for doctors, hands-on workshops, paraoptometric education, our annual Golf Tournament, and more. We look forward to seeing you there!",
  registrationUrl: "https://www.utaheyedoc.org/2026_uoa_annual_congress.php",
  hotelPhone: "1-435-731-4564",
  hotelBookingUrl: "https://www.hyatt.com/en-US/group-booking/SLCVD/G-UTOP",
  contactPhone: "801-364-9103",
  contactEmail: "uoa@utaheyedoc.org",
  contactName: "Chanae",
};

export const REGISTRATION = {
  earlyDeadline: "May 1, 2026",
  regularDeadline: "June 7, 2026",
  tiers: [
    { label: "UOA Member – Early (by 5/1/26)", price: "$500" },
    { label: "UOA Member – Regular (5/1–6/7/26)", price: "$525" },
    { label: "AOA Member – Early (by 5/1/26)", price: "$600" },
    { label: "AOA Member – Regular (5/1–6/7/26)", price: "$625" },
    { label: "Non-Member – Early (by 5/1/26)", price: "$750" },
    { label: "Non-Member – Regular (5/1–6/7/26)", price: "$775" },
    { label: "One-Day UOA Member Package", price: "$200" },
    { label: "One-Day Non-Member Package", price: "$250" },
    { label: "2025 UOA Graduate", price: "$400" },
    { label: "2026 AOA Graduate", price: "$100" },
    { label: "AOA Student Member (enrolled)", price: "$0" },
    { label: "Para – Early (by 5/1/26)", price: "$200" },
    { label: "Para – Regular (5/1–6/7/26)", price: "$210" },
  ],
};

export const SPEAKERS: Speaker[] = [
  {
    id: "s1",
    name: "Christopher Borgman, OD, FAAO",
    title: "Associate Professor",
    company: "Southern College of Optometry, Memphis, TN",
    bio: "Dr. Chris Borgman is an associate professor at the Southern College of Optometry in Memphis, TN. He earned his O.D. degree from the Illinois College of Optometry then completed a one-year residency in Primary Care and Ocular Disease at the Illinois Eye Institute in Chicago, Illinois. He has lectured in numerous continuing education venues on topics of primary care ocular diseases, ocular manifestations of systemic diseases, and neuro-optometric diseases.",
    photo: "https://i.pravatar.cc/300?img=51",
    sessionIds: ["d1", "d2", "d3"],
  },
  {
    id: "s2",
    name: "Angelica Echiverri, OD, MS",
    title: "Assistant Professor",
    company: "RMUoHP College of Optometric Medicine",
    bio: "Dr. Angelica Echiverri graduated with a dual OD/MS degree from the University of Houston College of Optometry. She completed a residency in Ocular Disease at Bascom Palmer Eye Institute in Miami, FL. Her published research can be found in Diabetes Epidemiology and Management. She is currently an assistant professor at the RMUoHP College of Optometric Medicine, where she teaches ocular disease and precepts students at the University Eye Institute.",
    photo: "https://i.pravatar.cc/300?img=47",
    sessionIds: ["d4", "d5", "d6"],
  },
  {
    id: "s3",
    name: "Kyle Klute, OD",
    title: "Primary Care Optometrist",
    company: "Ocular Disease Specialist",
    bio: "Dr. Kyle Klute received his optometry degree from Illinois College of Optometry in Chicago and then completed additional training at a Veterans Medical Center in Battle Creek, Michigan. He then worked at an ocular disease referral center exclusively managing sight-threatening conditions of the eye. Now, he brings that wealth of knowledge and experience to primary care, striving to identify sight-threatening conditions earlier before they manifest into life-altering situations.",
    photo: "https://i.pravatar.cc/300?img=12",
    sessionIds: ["d7", "d8", "d9", "d10"],
  },
  {
    id: "s4",
    name: "Tamara Petrosyan, OD",
    title: "Associate Clinical Professor",
    company: "SUNY Optometry & NY Health and Hospitals",
    bio: "Dr. Tamara Petrosyan is an associate clinical professor at SUNY Optometry and New York Health and Hospitals in the Primary Care, Ocular Disease, Pediatrics, and Vision Therapy departments. Dr. Petrosyan lectures internationally and has published articles and book chapters on various topics. She helped implement free pediatric exams for over 40,000 children through the Armenian Eyecare Project, developed over a dozen vision therapy workbooks, and helped start and previously worked with Anteo Health to develop all the vision therapy content. She is the InfantSEE liaison for New Jersey, head of the clinical care committees for pediatrics and vision therapy, and previously on the board of directors for NJSOP. Dr. Petrosyan has been awarded the Young Optometrist of the Year and Optometrist of the Year from NJSOP and the Young Optometrist of the Year award from the AOA.",
    photo: "https://i.pravatar.cc/300?img=23",
    sessionIds: ["d11", "d12", "d13"],
  },
  {
    id: "s5",
    name: "Jarrod Davies, OD, FCOVD",
    title: "Clinical Director",
    company: "Utah Vision Development Center, South Jordan, UT",
    bio: "Dr. Jarrod Davies currently practices in South Jordan, Utah as the clinical director of Utah Vision Development Center. He specializes in vision rehabilitation and sports vision performance training, working with athletes in baseball, tennis, hockey, golf, football, and ski teams on professional and amateur levels. Dr. Davies is a graduate of Brigham Young University and Southern College of Optometry. He is a founding member of the International Sports Vision Association and a Past-President of the Utah Optometric Association.",
    photo: "https://i.pravatar.cc/300?img=33",
    sessionIds: ["d14"],
  },
  {
    id: "s6",
    name: "Kassaundra Johnston, OD",
    title: "Optometrist",
    company: "Private Practice, Colorado Springs, CO",
    bio: "Dr. Kassaundra Johnston started her academic career at Schreiner University in Kerrville, TX. She received her Doctor of Optometry degree from the University of Houston College of Optometry (UHCO), where she completed a residency in Neuro-optometric Rehabilitation and served as Director of the Pediatrics and Binocular Vision Service. Her specialties include neuro-optometry, pediatrics, binocular vision, and special needs. She is a Fellow of the American Academy of Optometry.",
    photo: "https://i.pravatar.cc/300?img=9",
    sessionIds: ["d15", "d16", "d17"],
  },
  {
    id: "s7",
    name: "Mile Brujic, OD, FAAO",
    title: "Partner",
    company: "Premier Vision Group, Northwest Ohio",
    bio: "Dr. Brujic is a partner of Premier Vision Group, a successful three-location optometric practice in Northwest Ohio. He graduated from the New England College of Optometry in 2002. He practices full scope optometry with an emphasis on ocular disease management of the anterior segment, contact lenses, and glaucoma. He is active at all levels of organized optometry and is on the editorial board for a number of optometric publications. He has published over 200 articles and has given over 1,000 lectures nationally and internationally. Dr. Brujic co-owns Optometric Insights, which provides career coaching for optometry students and emerging practitioners. He brings a practical, clinically relevant approach to all his lectures.",
    photo: "https://i.pravatar.cc/300?img=68",
    sessionIds: ["d19", "d20", "d21", "d22", "d23"],
  },
  {
    id: "s8",
    name: "Aubri StClair",
    title: "Para Optometric Educator",
    company: "Utah Optometric Association",
    bio: "Aubri StClair is a featured paraoptometric educator presenting at the 2026 UOA Annual Congress. Her course focuses on multiple pair dispensing strategies and relevant ABO/CPC education for paraoptometric professionals.",
    photo: "https://i.pravatar.cc/300?img=56",
    sessionIds: ["p1"],
  },
  {
    id: "s9",
    name: "Anne Mika Moy, OD",
    title: "Associate Dean for Admissions & Student Affairs",
    company: "UC Berkeley Optometry",
    bio: "Dr. Mika Moy graduated from the Herbert Wertheim School of Optometry and Vision Science at UC Berkeley and completed a residency in Pediatrics and Cornea/Contact Lenses there. She is the Associate Dean for Admissions and Student Affairs at Berkeley Optometry where she teaches the Anterior Segment Disease course and is a clinical instructor as well as a mentor for residents. Her interests include anterior segment disease, pediatrics, and neuro-optometry. She is a Diplomate and Founding Member of the Anterior Segment Section of the American Academy of Optometry and currently serves as a Board Member for the American Academy of Optometry Foundation as well as the California Optometric Association. She recently received the Vincent Ellerbrock Clinician Educator Award from the Academy.",
    photo: "https://i.pravatar.cc/300?img=44",
    sessionIds: ["d24", "d25", "d26", "d27"],
  },
];

export const SESSIONS: Session[] = [
  {
    id: "d1",
    title: "OCT Grand Rounds",
    description:
      "This course will review and discuss several unique grand rounds cases where optical coherence tomography (OCT) was used as the main diagnostic technology to make the appropriate diagnosis in challenging case presentations. The purpose of this course will be to highlight the use of OCT in relatively new and/or unique ways to provide attendees with new insight on the use of OCT.",
    startTime: "1:00 PM",
    endTime: "2:00 PM",
    day: "Thu, June 4",
    room: "Grand Ballroom A",
    track: "Retinal Disease",
    speakerIds: ["s1"],
    tags: ["OCT", "imaging", "diagnosis"],
    copeId: "102606-GO",
  },
  {
    id: "d2",
    title: "Neuro, Optic Nerve & Orbit Brainteaser Cases",
    description:
      "This course will highlight 9 neuro-optometry cases that the author has managed to increase his knowledge in the neuro-optometry realm of eye care. The course will review the pathology and management of these cases, challenging attendees with complex presentations from neuro-ophthalmic practice.",
    startTime: "2:00 PM",
    endTime: "4:00 PM",
    day: "Thu, June 4",
    room: "Grand Ballroom A",
    track: "Neuro-Optometry",
    speakerIds: ["s1"],
    tags: ["neuro", "optic nerve", "orbit"],
    copeId: "102603-NO",
  },
  {
    id: "d3",
    title: "Retina Brainteaser Cases",
    description:
      "This course will review and discuss the pathology behind approximately a dozen retinal pathology cases that are not seen in optometry every day. An approach to review and use knowledge of ocular anatomy, physiology, and pathology will be reviewed to best manage these types of patients. New and old thoughts in the management and treatment of retinal pathology cases will also be reviewed.",
    startTime: "7:00 AM",
    endTime: "9:00 AM",
    day: "Fri, June 5",
    room: "Grand Ballroom A",
    track: "Retinal Disease",
    speakerIds: ["s1"],
    tags: ["retina", "pathology", "diagnosis"],
    copeId: "102605-TD",
  },
  {
    id: "d4",
    title: "Diagnosing and Managing Glaucoma in High Myopes",
    description:
      "High myopia can often present a challenge in the diagnosis and management of glaucoma. This one-hour lecture will discuss an overview of the confounding characteristics shared between high myopia and glaucoma, and include diagnostic tools to assist in differentiating myopic and glaucomatous changes.",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    day: "Thu, June 4",
    room: "Grand Ballroom B",
    track: "Glaucoma",
    speakerIds: ["s2"],
    tags: ["glaucoma", "myopia", "diagnosis"],
    copeId: "103826-GL",
  },
  {
    id: "d5",
    title: "Crash Course in Retina OCT and OCT-A",
    description:
      "Optical coherence tomography (OCT) and optical coherence tomography angiography (OCT-A) are important instruments in the diagnosis and management of retinal disease. This one-hour lecture will discuss an overview of these imaging modalities, including the interpretation of OCT and OCT-A scans and their clinical applications.",
    startTime: "5:00 PM",
    endTime: "6:00 PM",
    day: "Thu, June 4",
    room: "Grand Ballroom B",
    track: "Retinal Disease",
    speakerIds: ["s2"],
    tags: ["OCT", "OCT-A", "retina"],
    copeId: "103832-TD",
  },
  {
    id: "d6",
    title: "Ocular Pharmacology: New Ideas, New Uses, Old Drugs & Old Topics",
    description:
      "The field of ocular and systemic pharmacology is changing all the time. This lecture provides a review of interesting old and new drugs with exposure in optometric practice, reviewing potential new off-label uses of older drugs, as well as miscellaneous topics from a pharmacology perspective. Practical pharmacology knowledge and the clinical use of these pharmacologic agents will be the focus.",
    startTime: "9:00 AM",
    endTime: "11:00 AM",
    day: "Fri, June 5",
    room: "Grand Ballroom B",
    track: "Pharmacology",
    speakerIds: ["s2"],
    tags: ["pharmacology", "drugs", "clinical"],
    copeId: "102609-PH",
  },
  {
    id: "d7",
    title: "Choose the Code: Mastering E/M and Ophthalmic Coding",
    description:
      "Accurate coding is one of the most powerful and most misunderstood levers in primary care optometry. This two-hour course provides a practical, case-driven framework for choosing evaluation and management codes with confidence. Using real-world patient scenarios, attendees will work through the logic of medical decision-making, documentation requirements, time-based billing, special testing rules, and modifier use.",
    startTime: "8:00 AM",
    endTime: "10:00 AM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Practice Management",
    speakerIds: ["s3"],
    tags: ["coding", "billing", "E/M"],
    copeId: "103552-PM",
  },
  {
    id: "d8",
    title: "Using KPIs to Grow Medical Optometry",
    description:
      "Optometry stands at a crossroads: demand for medical eye care is rising sharply, yet most optometrists underutilize the very tools and codes that define sustainable medical practice. This course explores how Key Performance Indicators (KPIs) can serve as benchmarks for growth, help align optometrists with best practices, and ultimately improve patient outcomes in glaucoma, dry eye, and other chronic diseases.",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Practice Management",
    speakerIds: ["s3"],
    tags: ["KPIs", "growth", "medical optometry"],
    copeId: "103559-PM",
  },
  {
    id: "d9",
    title: "AI for Optometrists: Using AI Without Losing Your Clinical Mind",
    description:
      "Artificial intelligence is rapidly entering optometric practice, but enthusiasm for these tools has outpaced the frameworks needed to use them wisely. Using Evidence-Based Medicine as the organizing framework, this course examines where AI genuinely enhances clinical decision-making, where it introduces new hazards, and where it has no access at all. Attendees will leave with a durable framework for integrating AI into their practice without outsourcing clinical judgment.",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Practice Management",
    speakerIds: ["s3"],
    tags: ["AI", "technology", "clinical"],
    copeId: "103843-PM",
  },
  {
    id: "d10",
    title: "Glaucoma Management in Primary Eye Care",
    description:
      "This course equips primary care optometrists with a systematic blueprint for diagnosing, staging, and managing glaucoma. Emphasis will be placed on risk assessment, diagnostic imaging, evidence-based treatment decisions, and integration of coding and profitability considerations. Participants will gain confidence managing uncertainty and building sustainable glaucoma care models in everyday practice.",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
    day: "Sat, June 6",
    room: "Deer Valley Room",
    track: "Glaucoma",
    speakerIds: ["s3"],
    tags: ["glaucoma", "management", "primary care"],
    copeId: "103548-GL",
  },
  {
    id: "d11",
    title: "Shifting Paradigms: Evidence-Based Binocular Treatment of Amblyopia",
    description:
      "This lecture provides optometrists with an in-depth exploration of amblyopia as a binocular vision dysfunction, emphasizing evidence-based treatments and review of the PEDIG studies. It covers the neurophysiological mechanisms of amblyopia, diagnostic evaluation techniques, the Sanet-Vergara protocol for optimizing binocular refraction, and structured in-office vision therapy approaches.",
    startTime: "8:00 AM",
    endTime: "9:00 AM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Pediatrics & BV",
    speakerIds: ["s4"],
    tags: ["amblyopia", "binocular vision", "vision therapy"],
    copeId: "103532-FV",
  },
  {
    id: "d12",
    title: "From Impact to Impairment: Acquired Brain Injury",
    description:
      "Traumatic Brain Injury (TBI) evaluation and treatment is a growing field within optometry. This lecture delves into the intricate web of causes contributing to acquired brain injury (ABI), including primary and secondary head injury, closed head injury, blunt trauma, cerebrovascular accidents, and concussions, providing a comprehensive understanding of diverse mechanisms that can lead to this condition.",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Neuro-Optometry",
    speakerIds: ["s4"],
    tags: ["TBI", "brain injury", "concussion"],
    copeId: "103531-NO",
  },
  {
    id: "d13",
    title: "From Spit-up to Stereopsis: Infant Eye Exams Workshop",
    description:
      "This comprehensive workshop offers an essential foundation for conducting pediatric eye examinations, from infants and beyond. It will provide tips, tricks, knowledge, and skills necessary to provide optimal eye care for young patients. Co-taught with Dr. Jarrod Davies.",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Pediatrics & BV",
    speakerIds: ["s4", "s5"],
    tags: ["pediatrics", "infants", "workshop"],
    copeId: "103533-FV",
  },
  {
    id: "d14",
    title: "Seeing the Impact: Concussion Assessment in Optometric Practice",
    description:
      "Concussion is a frequently overlooked neurological injury that often presents with visually mediated symptoms in primary eye care. This one-hour course provides primary care optometrists with a concise, practical framework for recognizing concussion and performing a focused optometric assessment within scope of practice. Emphasis is placed on targeted history, symptom recognition, vision-based testing, and identification of red flags that warrant referral.",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Neuro-Optometry",
    speakerIds: ["s5"],
    tags: ["concussion", "TBI", "assessment"],
  },
  {
    id: "d15",
    title: "Common Questions in Pediatric Eye Care",
    description:
      "Case discussions that integrate common questions and referrals in a pediatric eye exam. The course will discuss when to prescribe and how to determine the most appropriate prescription for your patient. There will be an integration of referrals to other professionals and when that may be appropriate or necessary in pediatric eye care. The course will wrap up with a short discussion on pediatric medications for eye care.",
    startTime: "4:00 PM",
    endTime: "6:00 PM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Pediatrics & BV",
    speakerIds: ["s6"],
    tags: ["pediatrics", "prescribing", "medications"],
    copeId: "102372-FV",
  },
  {
    id: "d16",
    title: "BV Brainteasers",
    description:
      "Complex cases that take a little extra thought to come to a diagnosis or treatment options. We will integrate testing, anatomy, difficulties based on the patient's circumstances, as well as consideration of possible healing. The goal of this lecture will be to think outside the box from start to finish.",
    startTime: "6:00 PM",
    endTime: "7:00 PM",
    day: "Fri, June 5",
    room: "Grand Ballroom C",
    track: "Pediatrics & BV",
    speakerIds: ["s6"],
    tags: ["binocular vision", "complex cases"],
    copeId: "102992-FV",
  },
  {
    id: "d17",
    title: "Prescribing Prism in Any Practice Setting",
    description:
      "Case discussions that integrate different approaches to prescribing prism. The course will discuss testing, troubleshooting, and different prism options for clinicians to consider. The goal is to make prism prescribing easy and approachable for everyone.",
    startTime: "8:30 AM",
    endTime: "10:30 AM",
    day: "Sat, June 6",
    room: "Grand Ballroom C",
    track: "Pediatrics & BV",
    speakerIds: ["s6"],
    tags: ["prism", "prescribing", "binocular vision"],
    copeId: "102373-FV",
  },
  {
    id: "d18",
    title: "The Self-Aware Practice: Building a Healthy Practice Culture",
    description:
      "Optometric practices seeking a healthy culture should use personality assessments to know and better serve their team. This course teaches optometrists how to best implement personality assessments — including The Enneagram and The Working Genius — and to use them to create organizational health. The Enneagram uncovers the emotional and the 'why' behind personalities, whereas The Working Genius reveals 'what' and 'how' people like to work.",
    startTime: "11:30 AM",
    endTime: "12:30 PM",
    day: "Sat, June 6",
    room: "Deer Valley Room",
    track: "Practice Management",
    speakerIds: ["s3"],
    tags: ["culture", "leadership", "practice management"],
    copeId: "103563-PM",
  },
  {
    id: "d19",
    title: "OCT for the Anterior Segment",
    description:
      "OCT is commonly utilized for posterior segment disease. This course will explore clinical utilization for anterior segment OCT for anterior disease management and contact lens design.",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Topical Diagnosis",
    speakerIds: ["s7"],
    tags: ["OCT", "anterior segment", "contact lenses"],
    copeId: "98841-TD",
  },
  {
    id: "d20",
    title: "The Truth About Presbyopia Drops: Evidence-Based Cases and Myth-Busting Insights",
    description:
      "This course will discuss the unmet need in the presbyopic population and pharmaceutical agents that are being leveraged to provide patients with additional functionality.",
    startTime: "5:00 PM",
    endTime: "6:00 PM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Pharmacology",
    speakerIds: ["s7"],
    tags: ["presbyopia", "pharmacology", "drops"],
    copeId: "98841-TD",
  },
  {
    id: "d21",
    title: "Innovative Ways to Generate Revenue",
    description:
      "This course explores innovative revenue strategies that elevate both patient outcomes and practice performance. By aligning new offerings, operational efficiencies, and patient education with clinical care, providers can unlock sustainable growth.",
    startTime: "6:00 PM",
    endTime: "7:00 PM",
    day: "Fri, June 5",
    room: "Deer Valley Room",
    track: "Practice Management",
    speakerIds: ["s7"],
    tags: ["revenue", "practice management", "growth"],
    copeId: "99050-PM",
  },
  {
    id: "d22",
    title: "Twelve Innovations in Eye Care That You Need to Know About",
    description:
      "Eye care is experiencing rapid innovations which will improve patient care. As such, it will become increasingly important to understand how these technologies will be incorporated into clinical practice. This course will review new diagnostics and therapeutics and how they will play a critical role in clinical care.",
    startTime: "8:30 AM",
    endTime: "10:30 AM",
    day: "Sat, June 6",
    room: "Deer Valley Room",
    track: "Ocular Disease",
    speakerIds: ["s7"],
    tags: ["innovations", "technology", "diagnostics"],
    copeId: "98987-GO",
  },
  {
    id: "d23",
    title: "Rule These Out Before You Diagnose It As Dry Eye",
    description:
      "Although dry eye can be a debilitating condition for some, it can be virtually asymptomatic for others. Additionally, there are several conditions that can mimic dry eye. This course will discuss those conditions that need to be ruled out before starting a dry eye treatment regimen for patients complaining of dry eye symptoms.",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
    day: "Sat, June 6",
    room: "Deer Valley Room",
    track: "Topical Diagnosis",
    speakerIds: ["s7"],
    tags: ["dry eye", "differential diagnosis", "anterior segment"],
    copeId: "98986-TD",
  },
  {
    id: "d24",
    title: "Ocular Pain Management: New Philosophies and Regulations",
    description:
      "Pain is both an emotional and sensory experience. There are many acute causes for pain that optometrists treat on a daily basis, but management of patient's pain is often forgotten even though we have many options. Changing philosophies of pain management will be discussed.",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    day: "Sat, June 6",
    room: "Deer Valley Room",
    track: "Pharmacology",
    speakerIds: ["s9"],
    tags: ["pain management", "pharmacology", "ocular"],
    copeId: "100776-PH",
  },
  {
    id: "d25",
    title: "Visual Field Defects: Looking Beyond Glaucoma",
    description:
      "Visual fields are an important diagnostic tool in the armamentarium of the optometrist although they are inherently flawed due to their dependence on patient execution and doctor interpretation. Three cases are presented where screening VF were key in finding underlying disease — glaucoma was on the initial differential, but eventually retinal or neurologic diagnoses were determined. Pearls on VF interpretation and patient management will be discussed.",
    startTime: "8:00 AM",
    endTime: "9:00 AM",
    day: "Sun, June 7",
    room: "Deer Valley Room",
    track: "Glaucoma",
    speakerIds: ["s9"],
    tags: ["visual fields", "glaucoma", "neurology"],
    copeId: "100777-GL",
  },
  {
    id: "d26",
    title: "Painless Shingles and the Zoster of Tomorrow",
    description:
      "About 1/3 of people are afflicted with Herpes Zoster (HZ) or Shingles at some point in their life. Post herpetic neuralgia (PHN) is a very painful possible sequelae of HZ. With the approval of the Chicken Pox vaccine in 1996, clinical questions arose: What would decreasing rates of the vaccine do to rates of HZ and therefore PHN? Would vaccinated patients get HZ or chicken pox as adults? This lecture will go over the history of the disease and emerging data from how vaccine intervention is changing its profile. Case examples will be discussed.",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    day: "Sun, June 7",
    room: "Deer Valley Room",
    track: "Systemic Disease",
    speakerIds: ["s9"],
    tags: ["shingles", "herpes zoster", "systemic disease"],
    copeId: "104181-SD",
  },
  {
    id: "d27",
    title: "Mystery to Mastery: Anterior Segment Puzzles",
    description:
      "Optometrists play a key role in diagnosing and managing anterior segment disease. When a red eye case falls out of the typical ones seen, the doctor must utilize higher-level diagnostic skills to solve the patient's problem. The following cases provide the clinician with useful tools to aid in the diagnosis and management of anterior segment disease.",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    day: "Sun, June 7",
    room: "Deer Valley Room",
    track: "Topical Diagnosis",
    speakerIds: ["s9"],
    tags: ["anterior segment", "case studies", "diagnosis"],
    copeId: "103102-TD",
  },
];

export const PARA_SESSIONS: Session[] = [
  {
    id: "p1",
    title: "Multiple Pair: The Magic Number (ABO/CPC)",
    description:
      "This course explores the power of multiple pair dispensing and why it's one of the most impactful strategies in optical practice. Attendees will learn techniques for presenting and recommending multiple pairs to patients, understanding the value for both the patient and the practice, and earning ABO/CPC credit while growing their professional skills.",
    startTime: "TBD",
    endTime: "TBD",
    day: "Fri, June 5",
    room: "Para Education Room",
    track: "ABO/CPC",
    speakerIds: ["s8"],
    tags: ["multiple pair", "dispensing", "ABO", "CPC"],
  },
  {
    id: "p2",
    title: "Para Education Welcome & Overview",
    description:
      "Welcome to the 2026 UOA Para Education program! This session provides an overview of the paraoptometric education program, schedule, networking opportunities, and what to expect throughout the conference. Great opportunity to connect with fellow paras from across Utah.",
    startTime: "8:00 AM",
    endTime: "8:30 AM",
    day: "Thu, June 4",
    room: "Para Education Room",
    track: "General",
    speakerIds: [],
    tags: ["welcome", "overview", "networking"],
  },
  {
    id: "p3",
    title: "Optical Dispensing Excellence",
    description:
      "A comprehensive review of best practices in optical dispensing — from frame selection and measurements to lens technology recommendations. This session will cover practical skills to improve patient satisfaction and confidence in dispensing more complex lens designs.",
    startTime: "9:00 AM",
    endTime: "11:00 AM",
    day: "Thu, June 4",
    room: "Para Education Room",
    track: "Optical",
    speakerIds: [],
    tags: ["dispensing", "optical", "lenses"],
  },
  {
    id: "p4",
    title: "Understanding Ocular Disease: What Paras Need to Know",
    description:
      "Paras play a crucial role in pre-testing, patient communication, and care coordination. This course reviews common ocular diseases encountered in primary care optometry, teaching paras what to look for, how to communicate with patients, and how to support the doctor's clinical workflow more effectively.",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
    day: "Thu, June 4",
    room: "Para Education Room",
    track: "Clinical Knowledge",
    speakerIds: [],
    tags: ["ocular disease", "clinical", "pre-testing"],
  },
  {
    id: "p5",
    title: "Contact Lens Care & Patient Education",
    description:
      "This session focuses on contact lens care, compliance, and patient education strategies. Learn how to effectively counsel patients on proper wear schedules, replacement frequency, solution selection, and recognizing warning signs of contact lens-related complications.",
    startTime: "9:00 AM",
    endTime: "11:00 AM",
    day: "Fri, June 5",
    room: "Para Education Room",
    track: "Contact Lenses",
    speakerIds: [],
    tags: ["contact lenses", "patient education"],
  },
  {
    id: "p6",
    title: "Medical Billing & Insurance for Paraoptometrics",
    description:
      "Understanding billing codes, insurance verification, and medical documentation can make a huge difference in practice efficiency. This practical course walks through the billing workflow from a para's perspective, with tips on pre-authorizations, common denial reasons, and how to support accurate documentation.",
    startTime: "1:00 PM",
    endTime: "3:00 PM",
    day: "Fri, June 5",
    room: "Para Education Room",
    track: "Practice Management",
    speakerIds: [],
    tags: ["billing", "insurance", "documentation"],
  },
  {
    id: "p7",
    title: "Para Wrap-Up & Networking Reception",
    description:
      "Join fellow paraoptometrics for a closing session and networking reception. Connect with other paras from across Utah, share experiences, and celebrate the completion of your continuing education for 2026!",
    startTime: "4:00 PM",
    endTime: "5:30 PM",
    day: "Sat, June 6",
    room: "Para Education Room",
    track: "General",
    speakerIds: [],
    tags: ["networking", "reception", "wrap-up"],
  },
];

export const SPONSORS: Sponsor[] = [
  {
    id: "sp1",
    name: "2026 UOA Annual Congress Partners",
    tier: "platinum",
    logo: "https://utaheyedoc.org/images/favicon.ico",
    website: "https://www.utaheyedoc.org/2026_partners.php",
    description:
      "The 2026 UOA Annual Congress is supported by generous industry partners. Visit the exhibitor hall to connect with sponsors and learn about the latest products and services in optometry.",
    booth: "Exhibitor Hall",
  },
  {
    id: "sp2",
    name: "Grand Hyatt Deer Valley",
    tier: "platinum",
    logo: "https://logo.clearbit.com/hyatt.com",
    website: "https://www.hyatt.com/en-US/group-booking/SLCVD/G-UTOP",
    description:
      "The Grand Hyatt Deer Valley is the stunning, brand-new host venue for the 2026 UOA Annual Congress. Located in Park City, Utah, this world-class hotel offers exceptional accommodations and meeting facilities.",
    booth: "Hotel Host",
  },
  {
    id: "sp3",
    name: "American Optometric Association",
    tier: "gold",
    logo: "https://logo.clearbit.com/aoa.org",
    website: "https://www.aoa.org",
    description:
      "The American Optometric Association serves as the professional, scientific, and educational organization for doctors of optometry, students of optometry, and paraoptometric assistants and technicians.",
  },
  {
    id: "sp4",
    name: "Utah Optometric Association",
    tier: "gold",
    logo: "https://utaheyedoc.org/images/favicon.ico",
    website: "https://www.utaheyedoc.org",
    description:
      "The Utah Optometric Association serves Utah's doctors of optometry, supporting professional development, advocacy, and continuing education. UOA is the proud organizer of the 2026 Annual Congress.",
  },
];

export const VENUE: Venue = {
  name: "Grand Hyatt Deer Valley",
  address: "9100 Marsac Avenue",
  city: "Park City, UT 84060",
  mapsUrl: "https://maps.google.com/?q=Grand+Hyatt+Deer+Valley+Park+City+Utah",
  parkingInfo:
    "Parking is available at the Grand Hyatt Deer Valley. Attendees can also take advantage of the free Park City transit system. Hotel is ski-in/ski-out at Deer Valley Resort. Contact the hotel at 1-435-731-4564 for parking details.",
  wifiNetwork: "UOA2026",
  wifiPassword: "Contact UOA for credentials",
  rooms: [
    {
      id: "r1",
      name: "Grand Ballroom A",
      capacity: 300,
      floor: "Conference Level",
      features: ["Main doctor sessions", "A/V equipment", "Q&A microphones"],
    },
    {
      id: "r2",
      name: "Grand Ballroom B",
      capacity: 300,
      floor: "Conference Level",
      features: ["Doctor sessions", "Breakout seating"],
    },
    {
      id: "r3",
      name: "Grand Ballroom C",
      capacity: 300,
      floor: "Conference Level",
      features: ["Pediatrics & BV track", "Workshop space"],
    },
    {
      id: "r4",
      name: "Deer Valley Room",
      capacity: 150,
      floor: "Conference Level",
      features: ["Practice Management track", "Small group setting"],
    },
    {
      id: "r5",
      name: "Para Education Room",
      capacity: 100,
      floor: "Conference Level",
      features: ["Paraoptometric education", "ABO/CPC credit sessions"],
    },
    {
      id: "r6",
      name: "Exhibitor Hall",
      capacity: 500,
      floor: "Main Level",
      features: ["Exhibitor booths", "Networking area", "Lunch service"],
    },
  ],
};

export const UPDATES: Update[] = [
  {
    id: "u1",
    title: "Welcome to the 2026 UOA Annual Congress!",
    body: "We are thrilled to welcome you to the Grand Hyatt Deer Valley in Park City, Utah for the 2026 UOA Annual Congress! Registration and badge pick-up is open at the main entrance. Please check in early to get your conference materials.",
    timestamp: "2026-06-04T07:30:00Z",
    type: "announcement",
  },
  {
    id: "u2",
    title: "Hotel Room Preference Reminder",
    body: "If you prefer a queen room, please reserve doubles and write your preference in 'Special Requests' on the Summary page. Queen rooms are limited and not guaranteed. The hotel will contact you directly to switch your room if available.",
    timestamp: "2026-04-11T09:00:00Z",
    type: "info",
  },
  {
    id: "u3",
    title: "Golf Tournament Registration Now Open",
    body: "The annual UOA Golf Tournament is part of this year's congress program. Register separately for the golf event. Contact the UOA at 801-364-9103 or uoa@utaheyedoc.org for golf registration details.",
    timestamp: "2026-04-11T10:00:00Z",
    type: "announcement",
  },
  {
    id: "u4",
    title: "Early Registration Deadline: May 1, 2026",
    body: "Save money by registering before May 1, 2026. UOA Members save $25, AOA Members save $25, and Non-Members save $25 by registering early. Para early registration is $200 (vs. $210 regular). Register at utaheyedoc.org.",
    timestamp: "2026-04-11T11:00:00Z",
    type: "alert",
  },
  {
    id: "u5",
    title: "OD/Student Speed Networking Event",
    body: "Don't miss the OD/Student Speed Networking (Speed Dating) Event — a great opportunity for students to connect with practicing optometrists. There is a separate registration option for this event only. Details at utaheyedoc.org.",
    timestamp: "2026-04-11T12:00:00Z",
    type: "info",
  },
];

export const FAQ: FaqItem[] = [
  {
    id: "f1",
    question: "What does my registration include?",
    answer:
      "Doctor registration includes access to all CE sessions for your track, the exhibitor hall, networking events, and scheduled meals. Para registration includes access to all paraoptometric education sessions and the exhibitor hall. Check the registration page at utaheyedoc.org for full details.",
    category: "Registration",
  },
  {
    id: "f2",
    question: "What are the registration prices?",
    answer:
      "Doctor rates: UOA Member $500 early / $525 regular, AOA Member $600 early / $625 regular, Non-Member $750 early / $775 regular. Para rates: $200 early / $210 regular. Early deadline is May 1, 2026. Registration closes June 7, 2026.",
    category: "Registration",
  },
  {
    id: "f3",
    question: "How do I book a hotel room?",
    answer:
      "Rooms are blocked at the Grand Hyatt Deer Valley at special UOA pricing. Call 1-435-731-4564 and ask for the UOA convention block, or use the online booking link at utaheyedoc.org. Note: if you prefer a queen room, reserve doubles and note your preference in the 'Special Requests' field.",
    category: "Hotel & Venue",
  },
  {
    id: "f4",
    question: "Where is the Grand Hyatt Deer Valley?",
    answer:
      "The Grand Hyatt Deer Valley is located at 9100 Marsac Avenue, Park City, UT 84060. It is a brand-new hotel at Deer Valley Resort. Use the map link in the Venue section for directions.",
    category: "Hotel & Venue",
  },
  {
    id: "f5",
    question: "How do I register for the Golf Tournament?",
    answer:
      "Golf Tournament registration is separate from the main congress registration. Visit utaheyedoc.org or contact the UOA office at 801-364-9103 or uoa@utaheyedoc.org for golf registration details.",
    category: "Events",
  },
  {
    id: "f6",
    question: "How do I earn COPE credit?",
    answer:
      "Each eligible session has a COPE ID listed in the session details. Attendance will be tracked at sessions. CE certificates will be provided by the UOA following the conference. Contact uoa@utaheyedoc.org for questions about CE credit.",
    category: "Education",
  },
  {
    id: "f7",
    question: "Is there separate Para education?",
    answer:
      "Yes! The Para tab in this app has the full paraoptometric education schedule. Para sessions are held in the dedicated Para Education Room throughout the conference. Para registration is separate at $200 early / $210 regular.",
    category: "Education",
  },
  {
    id: "f8",
    question: "Who do I contact for help?",
    answer:
      "Contact Chanae at the Utah Optometric Association: call or text 801-364-9103, or email uoa@utaheyedoc.org. You can also stop by the UOA registration desk at the conference.",
    category: "General",
  },
  {
    id: "f9",
    question: "What is the OD/Student Speed Networking Event?",
    answer:
      "The OD/Student Speed Networking (Speed Dating) event is a special event designed to connect optometry students with practicing ODs. It can be registered for separately — check utaheyedoc.org for details and separate registration.",
    category: "Events",
  },
  {
    id: "f10",
    question: "Can I register for just one day?",
    answer:
      "Yes — a One-Day package is available for UOA Members at $200 and for Non-Members at $250. This allows attendance for a single day of the conference. Registration closes June 7, 2026.",
    category: "Registration",
  },
];

export function getSessionById(id: string): Session | undefined {
  return [...SESSIONS, ...PARA_SESSIONS].find((s) => s.id === id);
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

export function getParaSessionsByDay(): Record<string, Session[]> {
  const result: Record<string, Session[]> = {};
  for (const session of PARA_SESSIONS) {
    if (!result[session.day]) result[session.day] = [];
    result[session.day].push(session);
  }
  return result;
}
