// client.js
document.addEventListener("DOMContentLoaded", () => {
	const socket = io();
	const chatWindow = document.getElementById("chat-window");
	const messageList = document.getElementById("message-list");
	const messageInput = document.getElementById("message-input");
	const sendButton = document.getElementById("send-button");
	const roomNameElement = document.getElementById("room-name");
	const roomList = document.getElementById("room-list");

	let username = "";
	let currentRoom = "Chat General"; // Inicialmente, la sala es Chat General

	// Función para solicitar y establecer el nombre de usuario
	function setUsername() {
		// Solicitar el nombre de usuario con un cuadro de diálogo
		while (username.trim() === "") {
			username = prompt("Por favor, ingresa tu nombre de usuario:");
		}
		socket.emit("setUsername", { username }); // Enviar el nombre de usuario al servidor
	}

	// Función para unirse a la sala predeterminada "Chat General"
	function joinDefaultRoom() {
		socket.emit("joinRoom", { room: currentRoom, username }, (response) => {
			if (response.success) {
				changeRoom(currentRoom);
			} else {
				alert(response.message);
			}
		});
	}

    sendButton.addEventListener("click", () => {
        const message = messageInput.value;
        if (message.trim() !== "") {
            socket.emit("message", { message, sender: username, room: currentRoom });
            messageInput.value = "";
        }
    });

	// Función para cambiar de sala
	function changeRoom(newRoom) {
		currentRoom = newRoom;
		roomNameElement.textContent = newRoom;
		messageList.innerHTML = ""; // Limpiar la lista de mensajes al cambiar de sala
	}

	// Llamar a las funciones para establecer el nombre de usuario y unirse a la sala predeterminada
	setUsername();
	joinDefaultRoom();

	// Event listener para el botón de crear sala
	const createRoomButton = document.getElementById("create-room-button");
	createRoomButton.addEventListener("click", () => {
		const roomToCreate = prompt("Ingresa el nombre de la sala que deseas crear:");
		if (roomToCreate.trim() !== "") {
			socket.emit("createRoom", { room: roomToCreate }, (response) => {
				if (response.success) {
					changeRoom(roomToCreate);
				} else {
					alert(response.message);
				}
			});
		}
	});

	// Event listener para el botón de unirse a sala
	const joinRoomButton = document.getElementById("join-room-button");
	joinRoomButton.addEventListener("click", () => {
		const roomToJoin = prompt("Ingresa el nombre de la sala a la que deseas unirte:");
		if (roomToJoin.trim() !== "") {
			socket.emit("joinRoom", { room: roomToJoin, username }, (response) => {
				if (response.success) {
					changeRoom(roomToJoin);
				} else {
					alert(response.message);
				}
			});
		}
	});

	// Recibir la lista de salas disponibles y crear un div para cada una
	socket.on("roomList", (data) => {
		const roomListData = data.roomList || [];
		roomListData.forEach((roomName) => {
			createRoomDiv(roomName);
		});
	});

	// Función para crear un nuevo div para cada sala en la lista de salas
	function createRoomDiv(roomName) {
		const div = document.createElement("div");
		div.textContent = roomName;
		div.classList.add("room-item");
		div.addEventListener("click", () => {
			socket.emit("joinRoom", { room: roomName, username }, (response) => {
				if (response.success) {
					changeRoom(roomName);
				} else {
					alert(response.message);
				}
			});
		});
		roomList.appendChild(div);
	}

	// Recibir el historial de mensajes cuando el usuario se une a una sala
	socket.on("messageHistory", (data) => {
		const history = data.history || [];
		history.forEach((msg) => {
			addMessage(msg);
		});
	});
    
    // Escuchar los mensajes enviados por otros usuarios
    socket.on("message", (data) => {
        const { message, sender, room } = data;
        if (room === currentRoom) {
            addMessage({ message, sender });
            messageList.scrollTop = messageList.scrollHeight; // Desplazarse al último mensaje
        }
    });

	// Función para agregar un mensaje a la lista de mensajes
	function addMessage(msg) {
		const li = document.createElement("li");
		li.textContent = `${msg.sender}: ${msg.message}`;
		li.classList.add("message");
		if (msg.sender === username) {
			li.classList.add("sent");
		} else {
			li.classList.add("received");
		}
		messageList.appendChild(li);
	}
});
