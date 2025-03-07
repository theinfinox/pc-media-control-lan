const socket = io();
let pendingCommand = null;

// Function to send regular commands
function sendCommand(command) {
  socket.emit("media-control", { command });
}

// Function to show password modal for protected commands
function showPasswordDialog(command) {
  pendingCommand = command;
  document.getElementById("passwordModal").style.display = "block";
}

// Function to submit password-protected command
function submitProtectedCommand() {
  const password = document.getElementById("passwordInput").value;
  socket.emit("media-control", {
    command: pendingCommand,
    secure: true,
    pwd: password,
  });
  hidePasswordDialog();
}

// Function to cancel password prompt
function cancelProtectedCommand() {
  pendingCommand = null;
  hidePasswordDialog();
}

// Function to hide password modal
function hidePasswordDialog() {
  document.getElementById("passwordModal").style.display = "none";
  document.getElementById("passwordInput").value = "";
}

// Event listeners for sliders
const volumeSlider = document.getElementById("volumeSlider");
const brightnessSlider = document.getElementById("brightnessSlider");

// Volume Slider
volumeSlider.addEventListener("input", (e) => {
  const volumeValue = e.target.value;
  socket.emit("media-control", { command: `volume:${volumeValue}` });
});

// Brightness Slider
brightnessSlider.addEventListener("input", (e) => {
  const brightnessValue = e.target.value;
  socket.emit("media-control", { command: `brightness:${brightnessValue}` });
});

// Event listeners for password-protected commands
document.getElementById("shutdownBtn").addEventListener("click", () => showPasswordDialog("shutdown"));
document.getElementById("restartBtn").addEventListener("click", () => showPasswordDialog("restart"));
document.getElementById("sleepBtn").addEventListener("click", () => showPasswordDialog("sleep"));
document.getElementById("lockBtn").addEventListener("click", () => showPasswordDialog("lock"));

// Fetch server IP and generate QR code
fetch("/ipinfo")
  .then((response) => response.json()) // Ensure response is JSON
  .then((data) => {
    const accessUrl = `http://${data.ip}:3000`;
    document.getElementById("ip-info").innerText = `Access this page at: ${accessUrl} on your phone.`;

    new QRCode(document.getElementById("qrcode"), {
      text: accessUrl,
      width: 128,
      height: 128,
      colorDark: "#000",
      colorLight: "#fff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  })
  .catch(() => {
    document.getElementById("ip-info").innerText = `Unable to fetch the server IP.`;
  });
