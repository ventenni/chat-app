const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
	generateMessage,
	generateLocationMessage,
} = require("./utils/messages");
const {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

app.get("/", (req, res) => {
	res.send("Hello World!");
});

io.on("connection", (socket) => {
	socket.on("join", ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room });

		if (error) {
			return callback(error);
		}

		socket.join(user.room);

		socket.emit(
			"message",
			generateMessage(`Welcome ${user.username}!`, "Admin")
		);
		socket.broadcast
			.to(user.room)
			.emit(
				"message",
				generateMessage(`${user.username} has joined`, "Admin")
			);

		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on("sendMessage", (message, callback) => {
		const filter = new Filter();

		if (filter.isProfane(message)) {
			return callback("This probably said cunt or something");
		}

		const user = getUser(socket.id);

		console.log("send message", user);

		io.to(user.room).emit(
			"message",
			generateMessage(message, user.username)
		);
		callback();
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit(
				"message",
				generateMessage(`${user.username} has left`, user.username)
			);
			io.to(user.room).emit("roomData", {
				room: user.room,
				users: getUsersInRoom(user.room),
			});
		}
	});

	socket.on("sendLocation", (position, callback) => {
		const user = getUser(socket.id);

		const locationObject = generateLocationMessage(
			`https://google.com/maps?q=${position.latitude},${position.longitude}`,
			user.username
		);
		io.to(user.room).emit("locationMessage", locationObject);

		callback("Map link has been sent.");
	});
});

server.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
