import multer from "multer";

// configure multer storage (optional: store in memory or disk)
const storage = multer.memoryStorage();
export const upload = multer({ storage });
