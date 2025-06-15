document
  .getElementById("fetchButton")
  .addEventListener("click", fetchPlaylistData);

const PROXY_URL = "https://playlist-duration-pro.onrender.com";

async function fetchPlaylistData() {
  const inputField = document.getElementById("playlistInput");
  const playlistUrl = inputField.value;
  const playlistId = getPlaylistId(playlistUrl);

  if (!playlistId) {
    showError("Invalid YouTube Playlist URL");
    return;
  }

  try {
    console.log("Fetching playlist data..."); // Debug log
    const playlistData = await fetchPlaylistItems(playlistId);

    // Validate playlist data structure
    if (!playlistData?.items || !Array.isArray(playlistData.items)) {
      throw new Error("Playlist data is empty or invalid");
    }

    console.log("Playlist data received:", playlistData); // Debug log

    const videoIds = playlistData.items.map((item) => {
      if (!item?.contentDetails?.videoId) {
        console.error("Invalid playlist item:", item);
        throw new Error("Missing videoId in playlist item");
      }
      return item.contentDetails.videoId;
    });

    console.log("Fetching video details..."); // Debug log
    const videoDetails = await fetchVideoDetails(videoIds);

    // Validate video details structure
    if (!videoDetails?.items || !Array.isArray(videoDetails.items)) {
      throw new Error("Video details are empty or invalid");
    }

    console.log("Video details received:", videoDetails); // Debug log

    const videosWithDurations = combinePlaylistAndVideoData(
      playlistData,
      videoDetails
    );
    const totalDuration = calculateTotalDuration(videosWithDurations);

    displayTotalDuration(totalDuration);
    displayVideoTable(videosWithDurations);
  } catch (error) {
    console.error("Full error details:", error); // More detailed error logging
    showError("Failed to load playlist. Please check the URL and try again.");
  }
}

function getPlaylistId(url) {
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
      const errorData = await response.json().catch(() => ({}));
      console.error("Proxy error response:", errorData);
      throw new Error(`Proxy request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data?.items) {
      console.error("Invalid playlist data structure:", data);
      throw new Error("Invalid playlist data received from proxy");
    }

    return data;
  } catch (error) {
    console.error("Error in fetchPlaylistItems:", error);
    throw error;
  }
}

async function fetchVideoDetails(videoIds) {
  try {
    const response = await fetch(
      `${PROXY_URL}/api/video-details?videoIds=${videoIds.join(",")}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Video details error response:", errorData);
      throw new Error(
        `Video details request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data?.items) {
      console.error("Invalid video details structure:", data);
      throw new Error("Invalid video details received from proxy");
    }

    return data;
  } catch (error) {
    console.error("Error in fetchVideoDetails:", error);
    throw error;
  }
}

function combinePlaylistAndVideoData(playlistData, videoDetails) {
  return playlistData.items.map((item, index) => {
    // Safely handle missing data
    const fallbackThumbnail = "https://via.placeholder.com/120x90";
    const fallbackTitle = "Untitled Video";

    // Validate video details exist for this index
    const duration = videoDetails.items?.[index]?.contentDetails?.duration
      ? parseDuration(videoDetails.items[index].contentDetails.duration)
      : { hours: 0, minutes: 0, seconds: 0 };

    return {
      thumbnail: item.snippet?.thumbnails?.medium?.url || fallbackThumbnail,
      title: item.snippet?.title || fallbackTitle,
      duration: duration,
      url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
    };
  });
}

function parseDuration(duration) {
  try {
    const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    const seconds = parseInt(matches[3]) || 0;
    return { hours, minutes, seconds };
  } catch (error) {
    console.error("Error parsing duration:", duration, error);
    return { hours: 0, minutes: 0, seconds: 0 };
  }
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
