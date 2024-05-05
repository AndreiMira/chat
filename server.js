// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname)));

let rooms = {}; // Almacenar las salas existentes
let messageHistory = {}; // Historial de mensajes

// Cargar las salas desde el archivo JSON si existe
if (fs.existsSync("rooms.json")) {
    const data = fs.readFileSync("rooms.json", "utf8");
    rooms = JSON.parse(data);
}

// Cargar el historial de mensajes desde un archivo si existe, de lo contrario, iniciar con un objeto vacío
if (fs.existsSync("messageHistory.json")) {
    const data = fs.readFileSync("messageHistory.json", "utf8");
    messageHistory = JSON.parse(data);
}

io.on("connection", (socket) => {
    console.log("Nuevo usuario conectado");

    // Manejar el establecimiento del nombre de usuario
    socket.on("setUsername", (data) => {
        const { username } = data;
        socket.username = username; // Asignar el nombre de usuario al socket
    });

    socket.on("message", (data) => {
        const { message, sender, room } = data;
        
        // Si la sala no está especificada, enviar el mensaje a la sala predeterminada "Chat General"
        const targetRoom = room ? room : "Chat General";

        io.to(targetRoom).emit("message", { message, sender, room: targetRoom });

        // Guardar el mensaje en el historial
        if (!messageHistory[targetRoom]) {
            messageHistory[targetRoom] = [];
        }
        messageHistory[targetRoom].push({ message, sender });
        fs.writeFileSync("messageHistory.json", JSON.stringify(messageHistory));
    });

    socket.on("joinRoom", (data, callback) => {
        const { room } = data;
        const username = socket.username; // Obtener el nombre de usuario del socket

        // Verificar si la sala existe
        if (room !== "Chat General" && !rooms[room]) {
            callback({ success: false, message: "La sala no existe." });
        } else {
            socket.join(room);
            callback({ success: true, username }); // Enviar el nombre de usuario al cliente

            // Enviar el historial de mensajes cuando el usuario se une a la sala
            socket.emit("messageHistory", { history: messageHistory[room] || [] });

            io.to(room).emit("message", { message: `${username} se ha unido a la sala.`, sender: "Sistema", room });

            // Si la sala es diferente a "Chat General" y no existe en la lista de salas, almacenarla
            if (room !== "Chat General" && !rooms[room]) {
                rooms[room] = true;
                fs.writeFileSync("rooms.json", JSON.stringify(rooms));
            }
        }
    });

    socket.on("createRoom", (data, callback) => {
        const { room } = data;
        if (!rooms[room]) {
            // Verificar si la sala ya existe
            rooms[room] = true;
            socket.join(room);
            callback({ success: true });
            socket.emit("roomMessage", { message: "¡Has creado una nueva sala!" }); // Mensaje de confirmación

            // Almacenar la nueva sala
            fs.writeFileSync("rooms.json", JSON.stringify(rooms));
        } else {
            callback({ success: false, message: "La sala ya existe." });
        }
    });

    socket.on("disconnect", () => {
        console.log("Usuario desconectado");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Servidor corriendo en el puerto ${PORT}`);
});
