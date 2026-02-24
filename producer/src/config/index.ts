import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("process.env.PORT", process.env.PORT);

export default {
  port: process.env.PORT,
};
