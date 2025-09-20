import pkg from "pg";
import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const { Pool } = pkg;

// env validate
const envSchema = Joi.object({
  DB_HOSTNAME: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
}).unknown(true); // allow other env vars

const { error, value } = envSchema.validate(process.env);
if (error) {
  console.error("Environment validation error:", error.details.map(d => d.message).join(", "));
  process.exit(1);
}

const pool = new Pool({
  host: value.DB_HOSTNAME,
  user: value.DB_USERNAME,
  password: value.DB_PASSWORD,
  database: value.DB_DATABASE,
  port: value.DB_PORT,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

export { query, pool };
export default { query, pool };
