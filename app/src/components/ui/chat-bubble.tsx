import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatBubbleProps {
    message: string;
    sender: "user" | "agent";
    agentName?: "Leopoldo" | "Francisca" | "Antônia";
    timestamp?: string;
    className?: string;
}

export function ChatBubble({
    message,
    sender,
    agentName,
    timestamp,
    className,
}: ChatBubbleProps) {
    const isUser = sender === "user";

    return (
        <div
            className={cn(
                "flex w-full gap-3 p-4",
                isUser ? "flex-row-reverse" : "flex-row",
                className
            )}
        >
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
                {!isUser && agentName ? (
                    // TODO: Replace with Rive or dynamic image based on agentName
                    <AvatarImage src={`/rive/${agentName.toLowerCase()}_placeholder.png`} />
                ) : null}
                <AvatarFallback className={isUser ? "bg-zinc-200" : "bg-rose-100 text-rose-600"}>
                    {isUser ? "ME" : agentName?.[0] || "AI"}
                </AvatarFallback>
            </Avatar>

            {/* Message Content */}
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}
            >
                <p>{message}</p>

                {/* Timestamp */}
                {timestamp && (
                    <span className="mt-1 block text-[10px] opacity-70">
                        {timestamp}
                    </span>
                )}
            </div>
        </div>
    );
}
