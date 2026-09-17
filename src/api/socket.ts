import { io, Socket } from "socket.io-client"

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "https://api.full-food.hotel-familyhouse.uz/api"
  return apiUrl.replace(/\/api\/?$/, "")
}

export const socket: Socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ["websocket", "polling"],
})
