import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const booths = [
  { company: "Edward Jones", boothNumber: "98" },
  { company: "Lenz Therapeutics", boothNumber: "101" },
  { company: "Visionix", boothNumber: "103" },
  { company: "Restoration Ophthalmics", boothNumber: "106" },
  { company: "DSBVI", boothNumber: "108" },
  { company: "Hope Alliance", boothNumber: "110" },
  { company: "Rawzi Eyewear", boothNumber: "111" },
  { company: "Friends for Sight", boothNumber: "112" },
  { company: "Dompé", boothNumber: "200" },
  { company: "The Eye Institute", boothNumber: "201" },
  { company: "Glaukos", boothNumber: "202" },
  { company: "LKC Technologies", boothNumber: "203" },
  { company: "EssilorLuxottica Eyecare", boothNumber: "204" },
  { company: "Coopervision", boothNumber: "205" },
  { company: "Apellis Pharmaceuticals", boothNumber: "206" },
  { company: "VSP", boothNumber: "207" },
  { company: "Rocky Mountain University", boothNumber: "210" },
  { company: "Johnson & Johnson", boothNumber: "211" },
  { company: "Waite Vision", boothNumber: "212" },
  { company: "ADIT", boothNumber: "300" },
  { company: "Bausch+Lomb", boothNumber: "301" },
  { company: "Medically USA", boothNumber: "302" },
  { company: "Sun Pharma", boothNumber: "303" },
  { company: "Eye Designs LLC", boothNumber: "304" },
  { company: "Europa Eyewear", boothNumber: "305" },
  { company: "Aseptikits", boothNumber: "306" },
  { company: "Eyefficient/S4Optik", boothNumber: "307" },
  { company: "Cherry Optical Lab", boothNumber: "308" },
  { company: "L'Amy America", boothNumber: "309" },
  { company: "MyEyeDr", boothNumber: "310" },
  { company: "Premier Vision Lab", boothNumber: "311" },
  { company: "Alcon", boothNumber: "312" },
  { company: "Modern Optical", boothNumber: "313" },
  { company: "IT4Eyes", boothNumber: "314" },
  { company: "MOREL Eyewear", boothNumber: "315" },
  { company: "Blue River Medical, Inc", boothNumber: "400" },
  { company: "Orgreens Optics", boothNumber: "402" },
  { company: "Essilor Labs of America", boothNumber: "403" },
  { company: "Shamir Insights Inc", boothNumber: "404" },
  { company: "Luxottica Frames", boothNumber: "405" },
  { company: "Contamac", boothNumber: "406" },
  { company: "Essilor Instruments", boothNumber: "407" },
  { company: "Optikam Tech Inc", boothNumber: "411" },
  { company: "Kering Eyewear", boothNumber: "412" },
  { company: "MacuHealth", boothNumber: "414" },
  { company: "Optos, Inc", boothNumber: "415" },
  { company: "Topcon Healthcare", boothNumber: "500" },
  { company: "Utah Eye Centers", boothNumber: "502" },
  { company: "Teem", boothNumber: "503" },
  { company: "ZEISS", boothNumber: "507" },
  { company: "ZEISS", boothNumber: "509" },
  { company: "Optometric Aesthetics", boothNumber: "512" },
  { company: "Nikon Optical US", boothNumber: "514" },
  { company: "Hoopes Vision", boothNumber: "515" },
];

async function seed() {
  console.log(`Seeding ${booths.length} booths...`);
  let inserted = 0;
  let skipped = 0;

  for (const booth of booths) {
    const existing = await pool.query(
      "SELECT id FROM congress_booths WHERE company = $1 AND booth_number = $2",
      [booth.company, booth.boothNumber]
    );

    if (existing.rows.length > 0) {
      console.log(`  Skipped (already exists): ${booth.company} #${booth.boothNumber}`);
      skipped++;
      continue;
    }

    const secretToken = crypto.randomBytes(16).toString("hex");
    await pool.query(
      `INSERT INTO congress_booths (name, company, booth_number, secret_token)
       VALUES ($1, $2, $3, $4)`,
      [booth.company, booth.company, booth.boothNumber, secretToken]
    );
    console.log(`  Added: ${booth.company} #${booth.boothNumber}`);
    inserted++;
  }

  console.log(`\nDone. ${inserted} added, ${skipped} skipped.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
