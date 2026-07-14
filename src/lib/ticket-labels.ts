import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Aperto",
  IN_PROGRESS: "In lavorazione",
  WAITING_ON_USER: "In attesa (utente)",
  RESOLVED: "Risolto",
  CLOSED: "Chiuso",
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const categoryLabels: Record<TicketCategory, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  NETWORK: "Rete",
  ACCOUNT: "Account",
  OTHER: "Altro",
};

export const statusOrder: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_USER",
  "RESOLVED",
  "CLOSED",
];

export const priorityBadgeClass: Record<TicketPriority, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export const statusBadgeClass: Record<TicketStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  WAITING_ON_USER: "bg-purple-100 text-purple-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

export const statusBarClass: Record<TicketStatus, string> = {
  OPEN: "bg-yellow-400",
  IN_PROGRESS: "bg-blue-500",
  WAITING_ON_USER: "bg-purple-500",
  RESOLVED: "bg-green-500",
  CLOSED: "bg-gray-400",
};

export const priorityBarClass: Record<TicketPriority, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export const categoryBarClass: Record<TicketCategory, string> = {
  HARDWARE: "bg-indigo-500",
  SOFTWARE: "bg-teal-500",
  NETWORK: "bg-cyan-500",
  ACCOUNT: "bg-pink-500",
  OTHER: "bg-gray-400",
};

// Hex colors for SVG charts — must match the Tailwind classes above
export const statusChartColor: Record<TicketStatus, string> = {
  OPEN: "#facc15",
  IN_PROGRESS: "#3b82f6",
  WAITING_ON_USER: "#a855f7",
  RESOLVED: "#22c55e",
  CLOSED: "#9ca3af",
};

export const priorityChartColor: Record<TicketPriority, string> = {
  LOW: "#9ca3af",
  MEDIUM: "#3b82f6",
  HIGH: "#f97316",
  URGENT: "#ef4444",
};

export const categoryChartColor: Record<TicketCategory, string> = {
  HARDWARE: "#6366f1",
  SOFTWARE: "#14b8a6",
  NETWORK: "#06b6d4",
  ACCOUNT: "#ec4899",
  OTHER: "#9ca3af",
};
