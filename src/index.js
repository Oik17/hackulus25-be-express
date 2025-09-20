import dotenv from "dotenv";
import Joi from "joi";
import app from "./utils/app.js";
import cors from "cors";

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().port().default(4000),
  JWT_SECRET: Joi.string().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
}).unknown();

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
