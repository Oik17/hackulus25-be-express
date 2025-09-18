import pkg from "pg";
import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const { Pool } = pkg;

// env validate
const envSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required()
}).unknown(true); // allow other env vars

const { error, value } = envSchema.validate(process.env);
if (error) {
  console.error("Environment validation error:", error.details.map(d => d.message).join(", "));
  process.exit(1);
}

const pool = new Pool({
  connectionString: value.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

export { query, pool };
export default { query, pool };
