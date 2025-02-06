const socket = io();

function sendCommand(command) {
  socket.emit("media-control", command);
}

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
