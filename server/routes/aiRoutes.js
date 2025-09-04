import express from "express";
import { auth } from "../middlewares/auth";
import { generateArticle } from "../controllers/aiController";

const aiRouter = express.Router();
aiRouter.post("/generate-article", auth, generateArticle);

export default aiRouter;
