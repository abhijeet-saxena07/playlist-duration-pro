document
  .getElementById("fetchButton")
  .addEventListener("click", fetchPlaylistData);

// Update this to your proxy server URL (local or deployed)
const PROXY_URL = "http://localhost:3000"; // Change to your deployed URL later

async function fetchPlaylistData() {
  const inputField = document.getElementById("playlistInput");
  const playlistUrl = inputField.value;
  const playlistId = getPlaylistId(playlistUrl);

  if (!playlistId) {
    showError("Invalid YouTube Playlist URL");
    return;
  }

  try {
    // Fetch through proxy
    const playlistData = await fetchPlaylistItems(playlistId);
    const videoIds = playlistData.items.map(
      (item) => item.contentDetails.videoId
    );
    const videoDetails = await fetchVideoDetails(videoIds);

    const videosWithDurations = combinePlaylistAndVideoData(
      playlistData,
      videoDetails
    );
    const totalDuration = calculateTotalDuration(videosWithDurations);

    displayTotalDuration(totalDuration);
    displayVideoTable(videosWithDurations);
  } catch (error) {
    showError("An error occurred while fetching the playlist data");
    console.error("Error:", error);
  }
}

function getPlaylistId(url) {
  const regex = /[&?]list=([a-zA-Z0-9_-]{18,34})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Updated to use proxy
async function fetchPlaylistItems(playlistId) {
  const response = await fetch(
    `${PROXY_URL}/api/playlist-items?playlistId=${playlistId}`
  );
  if (!response.ok) throw new Error("Failed to fetch playlist items via proxy");
  return response.json();
}

// Updated to use proxy
async function fetchVideoDetails(videoIds) {
  const response = await fetch(
    `${PROXY_URL}/api/video-details?videoIds=${videoIds.join(",")}`
  );
  if (!response.ok) throw new Error("Failed to fetch video details via proxy");
  return response.json();
}

// Rest of your existing functions remain unchanged
function combinePlaylistAndVideoData(playlistData, videoDetails) {
  return playlistData.items.map((item, index) => ({
    thumbnail: item.snippet.thumbnails.medium.url,
    title: item.snippet.title,
    duration: parseDuration(videoDetails.items[index].contentDetails.duration),
    url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
  }));
}

function parseDuration(duration) {
  const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(matches[1]) || 0;
  const minutes = parseInt(matches[2]) || 0;
  const seconds = parseInt(matches[3]) || 0;
  return { hours, minutes, seconds };
}

function calculateTotalDuration(videos) {
  return videos.reduce(
    (total, video) => {
      total.hours += video.duration.hours;
      total.minutes += video.duration.minutes;
      total.seconds += video.duration.seconds;
      return total;
    },
    { hours: 0, minutes: 0, seconds: 0 }
  );
}

function displayTotalDuration(duration) {
  const { hours, minutes, seconds } = normalizeTime(duration);
  const totalDurationElement = document.getElementById("totalDuration");
  totalDurationElement.textContent = `Total Duration: ${hours}h ${minutes}m ${seconds}s`;
  totalDurationElement.style.display = "block";
  totalDurationElement.style.color = "#0a84ff";
}

function normalizeTime({ hours, minutes, seconds }) {
  minutes += Math.floor(seconds / 60);
  seconds %= 60;
  hours += Math.floor(minutes / 60);
  minutes %= 60;
  return { hours, minutes, seconds };
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
                    <img src="${video.thumbnail}" alt="${
      video.title
    }" class="video-thumbnail">
                    <svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
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
