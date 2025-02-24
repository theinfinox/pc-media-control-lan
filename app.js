const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const os = require("os");
const readline = require("readline");
const { exec } = require("child_process");

const app = express();
let pwd = ";"
const server = http.createServer(app);
const io = socketIo(server);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question(`Please set a password for the session ?`, ppd => {
  pwd = ppd;
  
});

// List of available network interfaces
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const availableInterfaces = [];

  for (const iface in interfaces) {
    for (const details of interfaces[iface]) {
      if (details.family === "IPv4" && !details.internal) {
        availableInterfaces.push({ name: iface, address: details.address });
      }
    }
  }

  if (availableInterfaces.length === 0) {
    console.log("No valid network interfaces found.");
    return "localhost";
  }

  console.log("Available Network Interfaces:");
  availableInterfaces.forEach((iface, index) => {
    console.log(`${index + 1}. ${iface.name} - ${iface.address}`);
  });


  rl.question("Select an interface by number: ", (input) => {
    const choice = parseInt(input, 10) - 1;
    if (choice >= 0 && choice < availableInterfaces.length) {
      const localIP = availableInterfaces[choice].address;
      console.log(`Selected IP: ${localIP}`);
      rl.close();
      startServer(localIP);
    } else {
      console.log("Invalid choice. Exiting.");
      rl.close();
    }
  });
}

function startServer(localIP) {
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("media-control", (command) => {
      console.log(`Received command: ${command}`);
      handleCommand(command);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  function executeCommand(command, platform) {
    try {
      switch (command) {
        // Media Controls
        case "play":
        case "pause":
          robot.keyTap("audio_play");
          break;
        case "next":
          robot.keyTap("audio_next");
          break;
        case "previous":
          robot.keyTap("audio_prev");
          break;
        case "stop":
          robot.keyTap("audio_stop");
          break;
        case "mute":
          robot.keyTap("audio_mute");
          break;
        case "volumeUp":
          robot.keyTap("audio_vol_up");
          break;
        case "volumeDown":
          robot.keyTap("audio_vol_down");
          break;

        case "brightnessUp":
          if (platform === "darwin") {
            // macOS
            robot.keyTap("brightness_up");
          } else if (platform === "win32") {
            // Windows
            exec(
              `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $((Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness + 10))`
            );
          } else if (platform === "linux") {
            robot.keyTap("brightness_up");
          }
          break;

        case "brightnessDown":
          if (platform === "darwin") {
            // macOS
            robot.keyTap("brightness_down");
          } else if (platform === "win32") {
            // Windows
            exec(
              `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $((Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness - 10))`
            );
          } else if (platform === "linux") {
            robot.keyTap("brightness_down");
          }
          break;
        case "lock":
          if (platform === "win32") {
            exec("rundll32 user32.dll,LockWorkStation");
          } else if (platform === "darwin") {
            exec(
              "/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend"
            );
          } else if (platform === "linux") {
            exec("gnome-screensaver-command -l");
          }
          break;
        case "shutdown":
          if (platform === "win32") {
            exec("shutdown /s /t 0");
          } else if (platform === "darwin") {
            exec("osascript -e 'tell app \"System Events\" to shut down'");
          } else if (platform === "linux") {
            exec("systemctl poweroff");
          }
          break;
        case "restart":
          if (platform === "win32") {
            exec("shutdown /r /t 0");
          } else if (platform === "darwin") {
            exec("osascript -e 'tell app \"System Events\" to restart'");
          } else if (platform === "linux") {
            exec("systemctl reboot");
          }
          break;
        case "sleep":
          if (platform === "win32") {
            exec("rundll32.exe powrprof.dll,SetSuspendState 0,1,0");
          } else if (platform === "darwin") {
            exec("pmset sleepnow");
          } else if (platform === "linux") {
            exec("systemctl suspend");
          }
          break;

        default:
          console.log(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
    }
  }

  function handleCommand(cc) {
    const platform = os.platform();
    command = cc.command;
    console.log(cc.command);
    secure = cc.secure;
    npwd = cc.pwd;
    if (secure) {
      if (npwd === process.env.PWD) {
        executeCommand(command, platform);
      } else {
        console.log("Invalid password");
        io.emit("invalid-password", "Invalid password");
      }
    } else {
      executeCommand(command, platform);
    }
  }

  app.get("/ipinfo/", (req, res) => {
    res.send({
      ip: localIP,
    });
  });

  server.listen(3000, () => {
    console.log(`Server running at http://${localIP}:3000`);
    console.log("Password for the session is: ", process.env.PWD);
  });
}

getLocalIP();
