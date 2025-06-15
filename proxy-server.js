require("dotenv").config();
const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

// Security middleware
app.use(
  cors({
    origin: ["chrome-extension://bimngffbkhoijkdapggkdeddfiaodkhj"], // Replace with your extension ID
  })
);

// Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// In your /api/playlist-items endpoint
app.get('/api/playlist-items', async (req, res) => {
    try {
      const { playlistId } = req.query;
      const response = await axios.get(
        `https://youtube.googleapis.com/youtube/v3/playlistItems`,
        {
          params: {
            part: 'snippet',
            maxResults: 50,
            playlistId,
            key: process.env.YOUTUBE_API_KEY // From .env
          }
        }
      );
      res.json(response.data); // Forward the exact JSON structure
    } catch (error) {
      res.status(500).json({ error: 'Proxy error' });
    }
  });

// Video details endpoint
app.get("/api/video-details", async (req, res) => {
  try {
    const { videoIds } = req.query;
    if (!videoIds) return res.status(400).json({ error: "Video IDs required" });

    const response = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos`,
      {
        params: {
          part: "contentDetails",
          id: videoIds.split(",").slice(0, 50).join(","), // Limit to 50 videos
          key: YT_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(500).json({ error: "Failed to fetch video details" });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
