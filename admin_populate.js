import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;
const SALT_ROUNDS = 10;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Admin data and panel assignments remain the same
const admins = [
  { email: "rishab.nagwani2023@vitstudent.ac.in", roll: "23BAI0085" },
  { email: "aryan.vinod2023@vitstudent.ac.in", roll: "23BIT0116" },
  { email: "nainika.anish2023@vitstudent.ac.in", roll: "23BCT0047" },
  { email: "simran.rawat2023@vitstudent.ac.in", roll: "23BAI0090" },
  { email: "janakipillai.raghav2023@vitstudent.ac.in", roll: "23BCE0806" },
  { email: "aaryan.shrivastav2023@vitstudent.ac.in", roll: "23BCE0927" },
  { email: "hitakshi.sardana2023@vitstudent.ac.in", roll: "23BAI0145" },
  { email: "suhani.singh2023@vitstudent.ac.in", roll: "23BEC0472" },
  { email: "priyanshu.kumar2023@vitstudent.ac.in", roll: "23BME0265" },
  { email: "saanvi.devendra2023@vitstudent.ac.in", roll: "23BDS0013" },
  { email: "akriti.agarwal2023@vitstudent.ac.in", roll: "23BDS0038" },
  { email: "ruhirohit.adke2023@vitstudent.ac.in", roll: "23MMI0004" },
];

const panelMap = {
  "rishab.nagwani": 1,
  "aryan.vinod": 2,
  "aaryan.shrivastav": 3,
  "nainika.anish": 4,
};

function formatName(email) {
  let prefix = email.split("@")[0];
  let parts = prefix.split(".");
  parts = parts.map((p) => p.replace(/\d+/g, ""));
  return parts
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ===================================================================
// NEW FUNCTION TO SEED PANELS
// ===================================================================
async function seedPanels(client) {
  console.log("⚠  Deleting existing panels...");
  // TRUNCATE panels as well
  await client.query("TRUNCATE TABLE panels RESTART IDENTITY CASCADE");

  console.log("⚡ Inserting new panels...");
  const tracksResult = await client.query(
    "SELECT track_id FROM tracks ORDER BY track_id"
  );
  const trackIds = tracksResult.rows.map((row) => row.track_id);

  if (trackIds.length < 7) {
    throw new Error(
      "Not enough tracks in the database to assign to panels. Please run the track import script first."
    );
  }

  // Panel 1: Tracks 1, 2
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 1", trackIds[0], trackIds[1]]
  );
  // Panel 2: Tracks 3, 4
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 2", trackIds[2], trackIds[3]]
  );
  // Panel 3: Tracks 5, 6
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 3", trackIds[4], trackIds[5]]
  );
  // Panel 4: Track 7
  await client.query("INSERT INTO panels (name, track_id) VALUES ($1, $2)", [
    "Panel 4",
    trackIds[6],
  ]);

  console.log("✅ Panels created and tracks assigned successfully!");
}
// ===================================================================

async function seedAdmins() {
  const client = await pool.connect();

  try {
    // UPDATED: Start a transaction
    await client.query("BEGIN");

    // STEP 1: Seed the panels first. This will throw an error if it fails.
    await seedPanels(client);

    // STEP 2: Proceed with seeding admins
    console.log("⚠  Deleting existing admins...");
    await client.query("TRUNCATE TABLE admins RESTART IDENTITY CASCADE");

    console.log("⚡ Inserting new admins...");
    for (const admin of admins) {
      const email = admin.email;
      const roll = admin.roll;
      const prefix = email.split("@")[0].replace(/\d+/g, "");
      const panel_id = panelMap[prefix] || null;
      const name = formatName(email);

      const hashedPassword = await bcrypt.hash(roll, SALT_ROUNDS);

      await client.query(
        `INSERT INTO admins (name, email, password_hash, panel_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hashedPassword, panel_id, "judge"]
      );

      console.log(
        `✅ Inserted: ${name} (${email}) → Panel: ${panel_id || "N/A"}`
      );
    }

    // If all steps succeeded, commit the transaction
    await client.query("COMMIT");
    console.log("🎉 Full seeding completed successfully!");
  } catch (err) {
    // If any step failed, roll back all changes
    await client.query("ROLLBACK");
    console.error("❌ Error during seeding process:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seedAdmins();
