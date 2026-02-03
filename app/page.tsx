"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);

  const sendMessage = async (customMessage?: string) => {
    if ((!input.trim() && !customMessage) || loading) return;

    const userMessage: Message = {
      role: "user",
      content: customMessage || input,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await res.json();

      if (data.canGenerate) {
        setCanGenerate(true);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.result },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl flex flex-col flex-1">
        <h1 className="text-3xl font-semibold mb-6 text-center">
          Inflection Point
        </h1>

        {/* Chat */}
        <div className="flex-1 space-y-6 overflow-y-auto mb-6">
          {messages.length === 0 && (
            <p className="text-center text-gray-500">
              What do you want to build?
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`whitespace-pre-line ${
                msg.role === "user"
                  ? "text-right font-medium"
                  : "text-left text-gray-800"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {loading && <div className="text-gray-400">Thinking…</div>}
        </div>

        {/* Generate CTA */}
        {canGenerate && (
          <button
            onClick={() =>
              sendMessage(
                "Yes, generate my business and first website."
              )
            }
            className="mb-4 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            Generate My Business
          </button>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Continue the conversation…"
            className="flex-1 px-4 py-3 border rounded-lg"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className={`px-5 py-3 rounded-lg font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:opacity-80"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
