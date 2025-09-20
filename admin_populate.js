// seedAdmins.js
import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;
const SALT_ROUNDS = 10;

// --- configure your DB connection (from .env recommended) ---
const pool = new Pool({
  user: process.env.DB_USER || "YOUR_USER",
  host: process.env.DB_HOST || "YOUR_HOST",
  database: process.env.DB_NAME || "YOUR_DATABASE",
  password: process.env.DB_PASS || "YOUR_PASSWORD",
  port: process.env.DB_PORT || 5432,
});

const admins = [
  { email: "rishab.nagwani2023@vitstudent.ac.in", roll: "23BAI0085" },
  { email: "aryan.vinod2023@vitstudent.ac.in", roll: "23BAI0085" },
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

// panel assignments
const panelMap = {
  "rishab.nagwani": 1,
  "aryan.deshpande": 2, // per your request
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

async function seedAdmins() {
  const client = await pool.connect();

  try {
    console.log("⚠  Deleting existing admins...");
    // Delete all rows and reset sequence
    await client.query("TRUNCATE TABLE admins RESTART IDENTITY CASCADE");

    console.log("⚡ Inserting new admins...");
    for (const admin of admins) {
      const email = admin.email;
      const roll = admin.roll; // plain password
      const prefix = email.split("@")[0].replace(/\d+/g, "");
      const panel_id = panelMap[prefix] || null;
      const name = formatName(email);

      // hash password
      const hashedPassword = await bcrypt.hash(roll, SALT_ROUNDS);

      await client.query(
        `INSERT INTO admins (name, email, password_hash, panel_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hashedPassword, panel_id, "admin"]
      );

      console.log(
        ✅ Inserted: ${name} (${email}) → Plain: ${roll} | Hashed: ${hashedPassword}
      );
    }

    console.log("🎉 Admin seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error inserting admins:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seedAdmins();