import dotenv from "dotenv";
import Joi from "joi";
import app from "./utils/app.js";

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
}).unknown(); // allow other env vars

const { error, value: env } = envSchema.validate(process.env);
if (error) {
  console.error("Environment variable validation error:", error.message);
  process.exit(1);
}

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
