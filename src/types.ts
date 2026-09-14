export type Theme = "black" | "white" | "oldschool" | "oxide" | "midnight" | "sepia"
export type BgStyle = "solid" | "gradient" | "animated" | "matrix"

export interface User {
  id: string
  username: string
  avatar: string
  createdAt: number
}

export interface Conversation {
  id: string
  name: string | null
  memberIds: string[]
  memberUsernames: string[]
  createdAt: number
  lastMessage: string
  lastAt: number
}

export interface Message {
  id: string
  conversationId: string
  fromId: string
  fromUsername: string
  text: string
  createdAt: number
}

export interface FriendRequest {
  id: string
  fromId: string
  fromUsername: string
  toId: string
  toUsername: string
  status: "pending" | "accepted" | "declined"
  createdAt: number
}

export interface Broadcast {
  id: string
  text: string
  type: "info" | "warning" | "update"
  createdAt: number
}
