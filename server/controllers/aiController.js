// server/controllers/aiController.js
import OpenAI from "openai";
import { clerkClient } from "@clerk/express";
import sql from "../configs/db.js"; // make sure this points to your Neon DB config
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import FormData from "form-data";

// Instantiate OpenAI client
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    // Make sure auth middleware sets these
    const userId = req.userId;
    const plan = req.plan;
    const free_usage = req.free_usage;

    const { prompt, length } = req.body;

    // Limit check for free users
    if (plan !== "premium" && free_usage >= 50) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    // Call OpenAI Gemini
    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: length,
    });

    const content = response.choices[0].message.content;

    // Insert into Neon Postgres
    await sql`
      INSERT INTO creations(user_Id, prompt, content, type)
      VALUES(${userId}, ${prompt}, ${content}, 'article')
    `;

    // Update free usage if not premium
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    // Respond with generated article
    res.json({ success: true, message: content });
  } catch (error) {
    console.error("generateArticle error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

//BlogTitles Generator
export const generateBlogTitle = async (req, res) => {
  try {
    // Make sure auth middleware sets these
    const userId = req.userId;
    const plan = req.plan;
    const free_usage = req.free_usage;

    const { prompt } = req.body;

    // Limit check for free users
    if (plan !== "premium" && free_usage >= 50) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue",
      });
    }

    // Call OpenAI Gemini
    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 100,
    });

    const content = response.choices[0].message.content;

    // Insert into Neon Postgres
    await sql`
      INSERT INTO creations(user_Id, prompt, content, type)
      VALUES(${userId}, ${prompt}, ${content}, 'blog-title')
    `;

    // Update free usage if not premium
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    // Respond with generated article
    res.json({ success: true, message: content });
  } catch (error) {
    console.error("generateBlogTitle error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

//Image Generator
export const generateImage = async (req, res) => {
  try {
    // Make sure auth middleware sets these
    const userId = req.userId;
    const plan = req.plan;
    const { prompt, publish } = req.body;

    // Limit check for free users
    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(
      data,
      "binary"
    ).toString("base64")}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image);
    // Insert into Neon Postgres
    await sql`
      INSERT INTO creations(user_Id, prompt, content, type, publish)
      VALUES(${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    // Respond with generated article
    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error("generateImage error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Background remover

export const removeImageBackground = async (req, res) => {
  try {
    // Make sure auth middleware sets these
    const userId = req.userId;
    const plan = req.plan;
    const { image } = req.file;

    // Limit check for free users
    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: "background_removal",
          backgound_removal: "remove_the_background",
        },
      ],
    });

    // Insert into Neon Postgres
    await sql`
      INSERT INTO creations(user_Id, prompt, content, type, publish)
      VALUES(${userId}, 'Remove background from image', ${secure_url}, 'image', )
    `;

    // Respond with generated article
    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.error("removeImageBackground error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// Object remover

export const removeImageObject = async (req, res) => {
  try {
    // Make sure auth middleware sets these
    const userId = req.userId;
    const plan = req.plan;
    const { image } = req.file;
    const { object } = req.body;

    // Limit check for free users
    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: "image",
    });

    // Insert into Neon Postgres
    await sql`
      INSERT INTO creations(user_Id, prompt, content, type)
      VALUES(${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image', )
    `;

    // Respond with generated article
    res.json({ success: true, content: imageUrl });
  } catch (error) {
    console.error("removeImageObject error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
