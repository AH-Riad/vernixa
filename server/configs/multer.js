import multer from "multer";
import path from "path";
import fs from "fs";

// Use Vercel's writable temporary directory
const uploadDir = path.join("/tmp", "uploads");

// Ensure the uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${file.originalname.replace(/\s/g, "-")}`;
    cb(null, name);
  },
});

export const upload = multer({ storage });
