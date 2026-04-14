import dotenv from "dotenv";
dotenv.config();
console.log("STABILITY:", process.env.STABILITY_API_KEY);

await import("./server.js");
