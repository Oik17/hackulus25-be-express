import dotenv from "dotenv";
import Joi from "joi";
import app from "./utils/app.js";
import cors from "cors";

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  DB_HOSTNAME: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
}).unknown(); // allow other env vars

const { error, value: env } = envSchema.validate(process.env);
if (error) {
  console.error("Environment variable validation error:", error.message);
  process.exit(1);
}

const PORT = env.PORT;

app.use(cors());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
