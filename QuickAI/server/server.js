import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";

const app = express();

app.use(cors());
app.use(express.json());

app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("SERVER IS LIVE!"));

app.use(requireAuth());
//hi this is a test commit to see if gits working fine
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("App is listening on port", PORT);
});
