const socket = io();

// Elements
const $messageForm = document.querySelector("#messageForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $locationButton = document.querySelector("#locationButton");
const $messages = document.querySelector("#messages");

// Templates
const $messageTemplate = document.querySelector("#message-template").innerHTML;
const $locationMessageTemplate = document.querySelector(
	"#location-message-template"
).innerHTML;
const $sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

const autoScroll = () => {
	// New message element
	const $newMessage = $messages.lastElementChild;

	// Height of new message
	const newMessageStyles = getComputedStyle($newMessage);
	const newMessageMargin = parseInt(newMessageStyles.marginBottom);
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

	const visibleHeight = $messages.offsetHeight;

	// Height of messages container
	const containerHeight = $messages.scrollHeight;

	// How far have I scrolled
	const scrollOffset = $messages.scrollTop + visibleHeight;

	if (containerHeight - newMessageHeight <= scrollOffset) {
		$messages.scrollTop = $messages.scrollHeight;
	}
};

// Options
const { username, room } = Qs.parse(location.search, {
	ignoreQueryPrefix: true,
});

socket.on("message", (message) => {
	console.log("message", message);
	const html = Mustache.render($messageTemplate, {
		message: message.text,
		createdAt: moment(message.createdAt).format("h:mm a"),
		username: message.username,
	});

	$messages.insertAdjacentHTML("beforeend", html);
	autoScroll();
});

socket.on("locationMessage", (location) => {
	console.log("location message", location);

	const html = Mustache.render($locationMessageTemplate, {
		location: location.url,
		createdAt: moment(location.createdAt).format("h:mm a"),
		username: location.username,
	});
	$messages.insertAdjacentHTML("beforeend", html);

	autoScroll();
});

socket.on("roomData", ({ room, users }) => {
	const html = Mustache.render($sidebarTemplate, {
		users,
		room,
	});
	document.querySelector("#sidebar").innerHTML = html;
});

document.querySelector("#messageForm").addEventListener("submit", (e) => {
	e.preventDefault();

	$messageFormButton.setAttribute("disabled", "disabled");

	const message = e.target.elements.message.value;
	socket.emit("sendMessage", message, (error) => {
		if (error) {
			return console.log(error);
		}
	});

	$messageFormButton.removeAttribute("disabled");
	$messageFormInput.value = "";
	$messageFormInput.focus();
});

document.querySelector("#locationButton").addEventListener("click", () => {
	if (!navigator.geolocation) {
		return alert("Ya don't have location shit available");
	}

	$locationButton.setAttribute("disabled", "disabled");

	navigator.geolocation.getCurrentPosition((position) => {
		const obj = {
			longitude: position.coords.longitude,
			latitude: position.coords.latitude,
		};

		socket.emit("sendLocation", obj, () => {
			$locationButton.removeAttribute("disabled");
		});
	});
});

socket.emit("join", { username, room }, (error) => {
	if (error) {
		alert(error);
	}
});
