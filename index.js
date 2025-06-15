document
  .getElementById("fetchButton")
  .addEventListener("click", fetchPlaylistData);

const PROXY_URL = "https://playlist-duration-pro.onrender.com";

async function fetchPlaylistData() {
  const inputField = document.getElementById("playlistInput");
  const playlistUrl = inputField.value.trim();
  const playlistId = getPlaylistId(playlistUrl);

  if (!playlistId) {
    showError("Invalid YouTube Playlist URL");
    return;
  }

  try {
    const playlistData = await fetchPlaylistItems(playlistId);

    // Validate playlist items structure
    if (
      !playlistData ||
      !playlistData.items ||
      !Array.isArray(playlistData.items)
    ) {
      throw new Error("Received invalid playlist data structure");
    }

    // Safely extract video IDs with validation
    const videoIds = [];
    for (const item of playlistData.items) {
      if (!item || !item.contentDetails || !item.contentDetails.videoId) {
        console.warn("Skipping invalid playlist item:", item);
        continue;
      }
      videoIds.push(item.contentDetails.videoId);
    }

    if (videoIds.length === 0) {
      throw new Error("No valid videos found in playlist");
    }

    const videoDetails = await fetchVideoDetails(videoIds);

    // Validate video details structure
    if (
      !videoDetails ||
      !videoDetails.items ||
      !Array.isArray(videoDetails.items)
    ) {
      throw new Error("Received invalid video details structure");
    }

    const videosWithDurations = combinePlaylistAndVideoData(
      playlistData,
      videoDetails
    );
    const totalDuration = calculateTotalDuration(videosWithDurations);

    displayTotalDuration(totalDuration);
    displayVideoTable(videosWithDurations);
  } catch (error) {
    console.error("Playlist fetch failed:", error);
    showError(error.message || "Failed to load playlist data");
  }
}

function getPlaylistId(url) {
  if (!url) return null;
  const regex = /[&?]list=([a-zA-Z0-9_-]{18,34})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function fetchPlaylistItems(playlistId) {
  try {
    const response = await fetch(
      `${PROXY_URL}/api/playlist-items?playlistId=${playlistId}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Validate basic response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from server");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch playlist items:", error);
    throw new Error("Could not retrieve playlist data");
  }
}

async function fetchVideoDetails(videoIds) {
  try {
    const response = await fetch(
      `${PROXY_URL}/api/video-details?videoIds=${videoIds.join(",")}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Validate basic response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from server");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch video details:", error);
    throw new Error("Could not retrieve video details");
  }
}

function combinePlaylistAndVideoData(playlistData, videoDetails) {
  return playlistData.items.map((item, index) => {
    // Fallback values
    const fallback = {
      thumbnail: "https://i.ytimg.com/vi/default.jpg",
      title: "Untitled Video",
      duration: { hours: 0, minutes: 0, seconds: 0 },
      url: "https://youtube.com",
    };

    // Skip if item is invalid
    if (!item || !item.snippet || !item.contentDetails) {
      return fallback;
    }

    // Get duration (if available)
    let duration = fallback.duration;
    if (
      videoDetails.items &&
      videoDetails.items[index] &&
      videoDetails.items[index].contentDetails
    ) {
      try {
        duration = parseDuration(
          videoDetails.items[index].contentDetails.duration
        );
      } catch (e) {
        console.warn("Failed to parse duration:", e);
      }
    }

    return {
      thumbnail: item.snippet.thumbnails?.medium?.url || fallback.thumbnail,
      title: item.snippet.title || fallback.title,
      duration: duration,
      url: `https://www.youtube.com/watch?v=${
        item.contentDetails.videoId || ""
      }`,
    };
  });
}

function parseDuration(duration) {
  if (!duration || typeof duration !== "string") {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return {
    hours: parseInt(matches[1]) || 0,
    minutes: parseInt(matches[2]) || 0,
    seconds: parseInt(matches[3]) || 0,
  };
}

function calculateTotalDuration(videos) {
  return videos.reduce(
    (total, video) => {
      total.seconds += video.duration.seconds;
      total.minutes += video.duration.minutes;
      total.hours += video.duration.hours;

      // Normalize overflow
      total.minutes += Math.floor(total.seconds / 60);
      total.seconds = total.seconds % 60;
      total.hours += Math.floor(total.minutes / 60);
      total.minutes = total.minutes % 60;

      return total;
    },
    { hours: 0, minutes: 0, seconds: 0 }
  );
}

function displayTotalDuration(duration) {
  const { hours, minutes, seconds } = duration;
  const totalDurationElement = document.getElementById("totalDuration");
  totalDurationElement.textContent = `Total Duration: ${hours}h ${minutes}m ${seconds}s`;
  totalDurationElement.style.display = "block";
  totalDurationElement.style.color = "#0a84ff";
}

function displayVideoTable(videos) {
  const tableContainer = document.getElementById("tableContainer");
  tableContainer.innerHTML = "";

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");

  videos.forEach((video) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>
                <a href="${video.url}" target="_blank" class="video-link">
                    <img src="${video.thumbnail}" alt="${video.title.replace(
      /"/g,
      "&quot;"
    )}" class="video-thumbnail">
                    <svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                </a>
            </td>
            <td>
                <div class="video-title">${video.title}</div>
                <div class="video-duration">${formatDuration(
                  video.duration
                )}</div>
            </td>
        `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

function formatDuration({ hours, minutes, seconds }) {
  return `${hours ? hours + "h " : ""}${minutes}m ${seconds}s`;
}

function showError(message) {
  const totalDurationElement = document.getElementById("totalDuration");
  totalDurationElement.textContent = message;
  totalDurationElement.style.color = "#ff3b30";
  totalDurationElement.style.display = "block";
}
