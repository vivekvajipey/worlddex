import "dotenv/config";
import express from "express";
import cors from "cors";
import photoRoutes from "./routes/photoRoutes";
import vlmRoutes from "./routes/vlmRoutes";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // For handling large base64 images

// Routes
app.use("/api/photos", photoRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 