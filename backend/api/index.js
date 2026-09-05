import app from "../dist/app.js";
import { connectDB } from "../dist/config/db.js";

await connectDB();

export default app;
