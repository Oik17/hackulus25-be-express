import pkg from "pg";
import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const { Pool } = pkg;

const envSchema = Joi.object({
  DATABASE_URL: Joi.string().uri(),
  DB_HOSTNAME: Joi.string(),
  DB_PORT: Joi.number().default(5432),
  DB_DATABASE: Joi.string(),
  DB_USERNAME: Joi.string(),
  DB_PASSWORD: Joi.string(),
}).unknown(true);

const { error, value } = envSchema.validate(process.env);
if (error) {
  console.error("Environment validation error:", error.details.map(d => d.message).join(", "));
  process.exit(1);
}

const pool = new Pool(
  value.DATABASE_URL
    ? { connectionString: value.DATABASE_URL }
    : {
      host: value.DB_HOSTNAME || "localhost",
      user: value.DB_USERNAME || "postgres",
      password: value.DB_PASSWORD || "",
      database: value.DB_DATABASE || "postgres",
      port: value.DB_PORT,
    }
);

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

export { query, pool };
export default { query, pool };
