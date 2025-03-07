const socket = io();

function sendCommand(command) {
  socket.emit("media-control", command);
}

// Add these event listeners to your existing script
const volumeSlider = document.getElementById("volumeSlider");
const brightnessSlider = document.getElementById("brightnessSlider");

// Volume Slider
volumeSlider.addEventListener("input", (e) => {
  const volumeValue = e.target.value;
  socket.emit("media-control", `volume:${volumeValue}`);
});

// Brightness Slider
brightnessSlider.addEventListener("input", (e) => {
  const brightnessValue = e.target.value;
  socket.emit("media-control", `brightness:${brightnessValue}`);
});

fetch("/ipinfo")
  .then((response) => response.text())
  .then((ip) => {
    const accessUrl = `http://${ip}:3000`;

    document.getElementById(
      "ip-info"
    ).innerText = `Access this page at: ${accessUrl} on your phone.`;

    const qrcode = new QRCode(document.getElementById("qrcode"), {
      text: accessUrl,
      width: 128,
      height: 128,
      colorDark: "#000",
      colorLight: "#fff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  })
  .catch(() => {
    document.getElementById(
      "ip-info"
    ).innerText = `Unable to fetch the server IP.`;
  });
