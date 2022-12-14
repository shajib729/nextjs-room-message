import { Server } from 'socket.io';


const Socketio = (req, res) => {
    
    let users = [];
    
    const addUser = ({ name, room, socketId }) => {
        !users.some((user) => user.name == name) &&
            users.push({ name, room, socketId });
    };
    
    const removeUser = (socketId) => {
        users = users.filter((user) => user.socketId !== socketId);
    };
    
    const getUser = (socketId) => {
        return users.find((user) => user.socketId === socketId);
    };
    res.status(200).json({ message: "Hello Api" })

    if (!res.socket.server.io) {
        const io = new Server(res.socket.server)

        io.on('connection', (socket) => {

            console.log(socket.id, 'connected');

            socket.on("adduser", ({ name, room }) => {
                socket.join(room)
                addUser({ name, room, socketId: socket.id })

                // send welcome message to the user
                socket.emit('welcome', { name, room })

                //send the joining msg to others member
                socket.broadcast.to(room).emit('newUserJoined', { name, room })

                // send the list of active users in the room
                const activeRoomUsers = users.filter((a) => a.room === room)
                io.to(room).emit("activeUsers", activeRoomUsers)
            })

            socket.on("sendMessage", ({ name, room, message }) => {
                io.to(room).emit("getMessage", {
                    name, room, message, type: 'message'
                });

                socket.broadcast.to(room).emit('notification')
            });

            socket.on('typing', ({ name, room, typing }) => {
                socket.broadcast.to(room).emit('typing', { name, room, typing })
            })

            socket.on("disconnecting", () => {
                console.log(socket.id, 'disconect');
                const user = getUser(socket.id)

                removeUser(socket.id)

                const activeRoomUsers = users.filter((a) => a.room == user?.room)

                //send the leveing of user msg to others member of the user's room
                user?.room && socket.to(user.room).emit('userHasLeft', user)

                // send list of active users
                user?.room && io.to(user.room).emit("activeUsers", activeRoomUsers)
            })
        })

        res.socket.server.io = io
    }
    res.end();
}

export const config = {
    api: {
        bodyParser: false
    }
}

export default Socketio;