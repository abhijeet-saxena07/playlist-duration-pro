document
  .getElementById("fetchButton")
  .addEventListener("click", fetchPlaylistData);

const PROXY_URL = "https://playlist-duration-pro.onrender.com";
const FALLBACK_THUMBNAIL = "https://i.ytimg.com/vi/default.jpg";

async function fetchPlaylistData() {
  const inputField = document.getElementById("playlistInput");
  const playlistUrl = inputField.value.trim();
  const playlistId = getPlaylistId(playlistUrl);

  if (!playlistId) {
    showError("Invalid YouTube Playlist URL");
    return;
  }

  try {
    showLoading(true);

    const playlistData = await fetchPlaylistItems(playlistId);

    // Validate playlist data structure
    if (!playlistData?.items || !Array.isArray(playlistData.items)) {
      throw new Error("Invalid playlist data received from server");
    }

    // Safely extract video IDs with validation
    const videoIds = playlistData.items
      .filter((item) => item?.contentDetails?.videoId)
      .map((item) => item.contentDetails.videoId);

    if (videoIds.length === 0) {
      throw new Error("No valid videos found in playlist");
    }

    const videoDetails = await fetchVideoDetails(videoIds);

    // Validate video details structure
    if (!videoDetails?.items || !Array.isArray(videoDetails.items)) {
      throw new Error("Invalid video details received from server");
    }

    const videosWithDurations = combinePlaylistAndVideoData(
      playlistData,
      videoDetails
    );
    const totalDuration = calculateTotalDuration(videosWithDurations);

    displayTotalDuration(totalDuration);
    displayVideoTable(videosWithDurations);
  } catch (error) {
    console.error("Error fetching playlist:", error);
    showError(error.message || "Failed to load playlist data");
  } finally {
    showLoading(false);
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
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
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
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch video details:", error);
    throw new Error("Could not retrieve video details");
  }
}

function combinePlaylistAndVideoData(playlistData, videoDetails) {
  return playlistData.items.map((item, index) => {
    // Fallback values
    const fallback = {
      thumbnail: FALLBACK_THUMBNAIL,
      title: "Untitled Video",
      duration: { hours: 0, minutes: 0, seconds: 0 },
      url: "https://youtube.com",
    };

    // Skip if item is invalid
    if (!item || !item.snippet || !item.contentDetails) {
      return fallback;
    }

    // Get duration if available
    let duration = fallback.duration;
    if (videoDetails.items?.[index]?.contentDetails?.duration) {
      try {
        duration = parseDuration(
          videoDetails.items[index].contentDetails.duration
        );
      } catch (e) {
        console.warn("Duration parse error:", e);
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
                    <img src="${video.thumbnail}" 
                         alt="${video.title.replace(/"/g, "&quot;")}" 
                         class="video-thumbnail"
                         onerror="this.src='${FALLBACK_THUMBNAIL}'">
                    <svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                        <path d="M7 7h10v10M7 17 17 7"/>
                    </svg>
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

function showLoading(isLoading) {
  const button = document.getElementById("fetchButton");
  if (isLoading) {
    button.innerHTML = '<div class="spinner"></div>';
    button.disabled = true;
  } else {
    button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>`;
    button.disabled = false;
  }
}
