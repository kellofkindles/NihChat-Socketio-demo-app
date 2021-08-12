const https = require('https')
const fs = require("./fs");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const server = new(require("http").Server)(app);
const enableUserList =
    process.env.ENABLE_USER_LIST !== undefined ?
    process.env.ENABLE_USER_LIST == 1 ?
    true :
    false :
    true;
const enableFileHistory =
    process.env.ENABLE_FILE_HISTORY !== undefined ?
    process.env.ENABLE_FILE_HISTORY == 1 ?
    true :
    false :
    false;
const enableAdmin =
    process.env.ENABLE_ADMIN !== undefined ?
    process.env.ENABLE_ADMIN == 1 ?
    true :
    false :
    true;
const {
    instrument
} = require("@socket.io/admin-ui");
const {
    Server
} = require("socket.io");
let io;
if (enableAdmin) {
    io = new Server(server, {
        cors: {
            origin: ["https://admin.socket.io"],
            credentials: true,
        },
    });
    instrument(io, {
        auth: {
            type: "basic",
            username: "admin",
            password: "$2b$10$Zz.omeTSQe4UGTfGBFSI2OIELWQW/moeOiEjeGZfUsFBGlBvg3UDG", // If you want to access admin, change this password or delete it!
        },
    });
} else {
    io = new Server(server);
}

const path = require("path");
const users = new Map();
if (enableFileHistory) {
    fs.readFromEnd("file.log", 50).then((data) => {
        console.log(data);
        for (const entry of JSON.parse("[" + data.join(",") + "]")) {
            sendMessage(entry, null, true);
        }
    });
}
const history = [];
app.use(express.static(path.join(__dirname, "public")));

io.use((socket, next) => {
    const username = escape(socket.handshake.auth.username);
    if (!username || username == "") {
        const err = new Error("Please provide a username.");
        err.data = {
            usernameRelated: true
        };
        return next(err);
    }
    if (username.length > 32) {
        const err = new Error("Username too long! Try another username.");
        err.data = {
            usernameRelated: true
        };
        return next(err);
    }
    if (users.has(username)) {
        const err = new Error("Username already taken! Try another username.");
        err.data = {
            usernameRelated: true
        };
        return next(err);
    }
    socket.username = username;
    next();
});

io.on("connection", (socket) => {
    console.log(`A user joined! ${socket.username}`);
    const obj = {
        timestamps: [],
        status: socket.handshake.auth.status || 0,
        socket,
    };
    users.set(socket.username, obj);
    socket.emit("history", history);
    updateUserList();
    sendMessage({
        type: "SYSTEM",
        color: "green",
        text: `<b>${socket.username}</b> joined the chat!`,
    });
    socket.on("newMessage", (message) => {
        if (!message || message.trim() == "") {
            return;
        }
        const time = Date.now();
        let i = 0;
        while (time - obj.timestamps[i] > 10000) {
            obj.timestamps.shift();
        }
        if (obj.timestamps.length > 11) {
            return sendMessage({
                    type: "SYSTEM",
                    color: "gold",
                    text: "You are sending messages too fast! Take a break.",
                },
                socket
            );
        }
        const msg = escape(message);
        if (msg.length > 500) {
            return sendMessage({
                    type: "SYSTEM",
                    color: "gold",
                    text: "You cant send messages longer than 500 characters!",
                },
                socket
            );
        }
        obj.timestamps.push(Date.now());
        sendMessage({
            type: "USER",
            username: socket.username,
            message: msg,
        });
    });
    socket.on("disconnect", (reason) => {
        if (users.has(socket.username)) {
            users.delete(socket.username);
            updateUserList();
            sendMessage({
                type: "SYSTEM",
                color: "red",
                text: `<b>${socket.username}</b> left the chat!`,
            });
            console.log(`User ${socket.username} left! Reason: ${reason}`);
        }
    });
    socket.on("status", (number) => {
        if (number in statuses) {
            obj.status = number;
        } else {
            return;
        }
        updateUserList();
    });
});

function addEntry(data) {
    if (history.length === 50) {
        history.shift();
    }
    history.push(data);
    if (enableFileHistory) {
        fs.append("file.log", JSON.stringify(data) + "\n");
    }
}

function sendMessage(data, socket, raw) {
    if (!raw) {
        data.timestamp = Date.now();
    }
    if (socket) {
	    if(process.env.WEBHOOK_ID_PASSWORD != null){
	    const data = JSON.stringify({
            content: data.message
            author: data.username
        })

        const options = {
            hostname: 'discord.com/api/webhooks',
            port: 443,
            path: process.env.WEBHOOK_ID_PASSWORD,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }
        const req = https.request(options)

        req.on('error', error => {
            console.error(error)
        })

        req.write(data)
        req.end()
	    }
        
        return socket.emit("newMessage", data);
    }
    io.sockets.emit("newMessage", data);



    addEntry(data);
}

const statuses = {
    0: "🟢",
    1: "🟡",
    2: "🔴",
};

function makeUserList() {
    const arr = [];
    for (const [username, data] of users.entries()) {
        arr.push(`${username} (${statuses[data.status]})`);
    }
    return arr;
}

function updateUserList() {
    if (enableUserList) {
        io.sockets.emit("users", [...makeUserList()]);
    } else {
        io.sockets.emit("users", {
            length: users.size,
        });
    }
}

function escape(s) {
    let replace = {
        "&": "&amp;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
    };
    return s.replace(/[&"<>]/g, (c) => replace[c]);
}

server.listen(PORT, () => {
    console.log(`listening on localhost:${PORT}`);
});
// This is just a sample script. Paste your real code (javascript or HTML) here.

if ('this_is' == /an_example/) {
    of_beautifier();
} else {
    var a = b ? (c % d) : e[f];
}
