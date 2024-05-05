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
let userRooms = {};

if (fs.existsSync("userRooms.json")) {
	const data = fs.readFileSync("userRooms.json", "utf8");
	userRooms = JSON.parse(data);
}

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

	// Manejo de mensajes en el servidor
	socket.on("message", (data) => {
		const { message, sender, room } = data;

		const targetRoom = room ? room : "Chat General";

		// Si el sender es "Sistema", enviar el mensaje sin el sender
		if (sender === "Sistema") {
			io.to(targetRoom).emit("message", { message, room: targetRoom });
		} else {
			// Si el sender es otro usuario, enviar el mensaje con el sender
			io.to(targetRoom).emit("message", { message, sender, room: targetRoom });
		}

		// Guardar el mensaje en el historial
		if (!messageHistory[targetRoom]) {
			messageHistory[targetRoom] = [];
		}

		messageHistory[targetRoom].push({ message, sender });
		fs.writeFileSync("messageHistory.json", JSON.stringify(messageHistory));
	});

	socket.on("joinRoom", (data, callback) => {
		const { room } = data;
		const username = socket.username;

		// Verificar si la sala existe
		if (room !== "Chat General" && !rooms[room]) {
			callback({ success: false, message: "La sala no existe." });
		} else {
			socket.join(room);
			callback({ success: true, username });

			// Guardar la sala en la lista de salas del usuario
			if (!userRooms[username]) {
				userRooms[username] = [];
			}

			if (!userRooms[username].includes(room)) {
				userRooms[username].push(room);
				fs.writeFileSync("userRooms.json", JSON.stringify(userRooms));

				// Emitir las salas actualizadas al cliente
				io.to(socket.id).emit("updateRoomList", { rooms: userRooms[username] });
			}

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
        const username = socket.username;
		if (!rooms[room]) {
			// Verificar si la sala ya existe
			rooms[room] = true;
			socket.join(room);
			callback({ success: true });

			// Agregar la sala a la lista de salas del usuario
			if (!userRooms[username]) {
				userRooms[username] = [];
			}
			if (!userRooms[username].includes(room)) {
				userRooms[username].push(room);
				fs.writeFileSync("userRooms.json", JSON.stringify(userRooms));

				// Emitir las salas actualizadas al cliente
				io.to(socket.id).emit("updateRoomList", { rooms: userRooms[username] });
			}

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
