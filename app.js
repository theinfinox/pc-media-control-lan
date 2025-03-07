const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const robot = require("robotjs");
const os = require("os");
const readline = require("readline");
const loudness = require("loudness");  // For controlling volume
const fs = require('fs');
const { exec, execFile } = require("child_process");


function getLoudnessBinaryPath() {
  const origPath = path.join(__dirname, 'node_modules', 'loudness', 'impl', 'windows', 'adjust_get_current_system_volume_vista_plus.exe');
  
  if (process.pkg) {
    // When running from a pkg snapshot, extract the file from the virtual fs.
    const tempPath = path.join(os.tmpdir(), 'adjust_get_current_system_volume_vista_plus.exe');
    try {
      if (!fs.existsSync(tempPath)) {
        // Read the file from the snapshot and write it to a real file
        const data = fs.readFileSync(origPath);
        fs.writeFileSync(tempPath, data, { mode: 0o755 });
        console.log('Extracted loudness binary to:', tempPath);
      } else {
        console.log('Using existing extracted binary:', tempPath);
      }
      return tempPath;
    } catch (error) {
      console.error('Error extracting loudness binary:', error);
      return null;
    }
  }
  
  return origPath;
}

const app = express();
let pwd = "";
const server = http.createServer(app);
const io = socketIo(server);

// Create readline interface for terminal prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// First, ask for the session password
rl.question("Please set a password for the session: ", (ppd) => {
  pwd = ppd;
  console.log("Password set successfully.\n");
  // Then, show available network interfaces
  getLocalIP();
});

// List available network interfaces and allow user selection
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
    startServer("localhost");
    return;
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

// Start the Express server and set up socket.io event listeners
function startServer(localIP) {
  // Serve static files from the "public" folder
  app.use(express.static(path.join(__dirname, "public")));

  // Route for the home page
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("Client connected");

    // Log the full command details using JSON.stringify
    socket.on("media-control", (command) => {
      console.log("Received command:", JSON.stringify(command));
      handleCommand(command);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // Execute volumecommands based on platform and command type
  function executeCommand(command, platform) {
    // Handle slider commands for volume and brightness
    if (typeof command === "string" && command.startsWith("volume:")) {
      // Extract volume level (0 to 100)
      let volVal = parseInt(command.split(":")[1], 10);
      
      if (process.pkg) {
        // In pkg environment, use the extracted binary via execFile
        const binaryPath = getLoudnessBinaryPath();
        execFile(binaryPath, [String(volVal)], (err, stdout, stderr) => {
          if (err) {
            console.error("Error setting volume:", err);
          } else {
            console.log(`Volume set to ${volVal}`);
          }
        });
      } else {
        // In normal environment, use the loudness module
        loudness.setVolume(volVal)
          .then(() => {
            console.log(`Volume set to ${volVal}`);
          })
          .catch((err) => console.error("Error setting volume:", err));
      }
      return;
    }





    if (typeof command === "string" && command.startsWith("brightness:")) {
      // Extract brightness value (assuming 0 to 100)
      let brightnessVal = parseInt(command.split(":")[1], 10);
      if (platform === "win32") {
        exec(
          `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${brightnessVal})`
        );
      } else if (platform === "darwin") {
        // For macOS, you might use another method if needed
        robot.keyTap("brightness_up"); // Placeholder
      } else if (platform === "linux") {
        robot.keyTap("brightness_up"); // Placeholder
      }
      return;
    }

    // Process other commands using a switch-case
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
      // Brightness Controls (if not coming from slider)
      case "brightnessUp":
        if (platform === "darwin") {
          robot.keyTap("brightness_up");
        } else if (platform === "win32") {
          exec(
            `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $((Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness + 10))`
          );
        } else if (platform === "linux") {
          robot.keyTap("brightness_up");
        }
        break;
      case "brightnessDown":
        if (platform === "darwin") {
          robot.keyTap("brightness_down");
        } else if (platform === "win32") {
          exec(
            `powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, $((Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness - 10))`
          );
        } else if (platform === "linux") {
          robot.keyTap("brightness_down");
        }
        break;
      // System Commands
      case "lock":
        if (platform === "win32") {
          exec("rundll32 user32.dll,LockWorkStation");
        } else if (platform === "darwin") {
          exec("/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend");
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
  }

  // Handle incoming commands (both protected and unprotected)
  function handleCommand(cc) {
    // Allow a command to be either a simple string or an object with properties
    let command = cc.command || cc;
    let secure = cc.secure || false;
    let npwd = cc.pwd || "";

    if (secure) {
      if (npwd === pwd) {
        executeCommand(command, os.platform());
      } else {
        console.log("Invalid password");
        io.emit("invalid-password", "Invalid password");
      }
    } else {
      executeCommand(command, os.platform());
    }
  }

  // Endpoint for retrieving the server's IP address
  app.get("/ipinfo", (req, res) => {
    res.json({ ip: localIP });
  });

  // Start the server on port 3000
  server.listen(3000, () => {
    console.log(`Server running at http://${localIP}:3000`);
    console.log("Password for the session is:", pwd);
  });
}
