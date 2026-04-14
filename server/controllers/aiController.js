import Groq from "groq-sdk";
import { clerkClient } from "@clerk/express";
import sql from "../configs/db.js";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";
import axios from "axios";

// =========================
// GROQ SETUP
// =========================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =========================
// GROQ HELPER
// =========================
export const groqChat = async (prompt, maxTokens = 500) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    return response.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Groq error:", err.message);
    throw new Error("AI generation failed");
  }
};

// =========================
// ARTICLE
// =========================
export const generateArticle = async (req, res) => {
  try {
    const { userId, plan, free_usage } = req;
    const { prompt, length } = req.body;

    if (plan !== "premium" && free_usage >= 50)
      return res.json({ success: false, message: "Limit reached" });

    const content = await groqChat(prompt, length || 500);

    await sql`
      INSERT INTO creations(user_id, prompt, content, type)
      VALUES(${userId}, ${prompt}, ${content}, 'article')
    `;

    res.json({ success: true, content });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// =========================
// BLOG TITLE
// =========================
export const generateBlogTitle = async (req, res) => {
  try {
    const { userId, plan, free_usage } = req;
    const { prompt } = req.body;

    const content = await groqChat(prompt, 100);

    await sql`
      INSERT INTO creations(user_id, prompt, content, type)
      VALUES(${userId}, ${prompt}, ${content}, 'blog-title')
    `;

    res.json({ success: true, content });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// =========================
// IMAGE GENERATION
// =========================

export const generateImage = async (req, res) => {
  try {
    const { userId, plan } = req;
    const { prompt, publish } = req.body;

    if (plan !== "premium") {
      return res.json({ success: false, message: "Premium only" });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) throw new Error("STABILITY_API_KEY missing");

    // STEP 1: call Stability API
    const response = await axios.post(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    // STEP 2: safety check
    if (!response.data?.artifacts?.length) {
      throw new Error("No image returned from Stability API");
    }

    const base64 = response.data.artifacts[0].base64;

    if (!base64) {
      throw new Error("Invalid image response format");
    }

    // STEP 3: upload to cloudinary
    const upload = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64}`,
    );

    // STEP 4: save DB
    await sql`
      INSERT INTO creations(user_id, prompt, content, type, publish)
      VALUES(${userId}, ${prompt}, ${upload.secure_url}, 'image', ${publish ?? false})
    `;

    return res.json({
      success: true,
      content: upload.secure_url,
    });
  } catch (err) {
    console.error("IMAGE ERROR:", err.response?.data || err.message);

    return res.json({
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        err.message,
    });
  }
};

// =========================
// BACKGROUND REMOVAL
// =========================
export const removeImageBackground = async (req, res) => {
  try {
    const { userId, plan } = req;
    const image = req.file;

    if (plan !== "premium")
      return res.json({ success: false, message: "Premium only" });

    const result = await cloudinary.uploader.upload(image.path, {
      transformation: [{ effect: "background_removal" }],
    });

    await sql`
      INSERT INTO creations(user_id, prompt, content, type)
      VALUES(${userId}, 'Remove background', ${result.secure_url}, 'image')
    `;

    res.json({ success: true, content: result.secure_url });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// =========================
// OBJECT REMOVAL
// =========================
export const removeImageObject = async (req, res) => {
  try {
    const { userId, plan } = req;
    const { object } = req.body;
    const image = req.file;

    if (plan !== "premium")
      return res.json({ success: false, message: "Premium only" });

    const upload = await cloudinary.uploader.upload(image.path);

    const url = cloudinary.url(upload.public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
    });

    await sql`
      INSERT INTO creations(user_id, prompt, content, type)
      VALUES(${userId}, ${`Remove ${object}`}, ${url}, 'image')
    `;

    res.json({ success: true, content: url });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};

// =========================
// RESUME REVIEW
// =========================
export const resumeReview = async (req, res) => {
  try {
    const { userId, plan } = req;
    const resume = req.file;

    if (plan !== "premium")
      return res.json({ success: false, message: "Premium only" });

    const data = fs.readFileSync(resume.path);
    const pdfData = await pdf(data);

    const prompt = `Review resume:\n\n${pdfData.text}`;

    const content = await groqChat(prompt, 1000);

    await sql`
      INSERT INTO creations(user_id, prompt, content, type)
      VALUES(${userId}, 'Resume review', ${content}, 'resume-review')
    `;

    res.json({ success: true, content });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};
