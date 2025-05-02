// Description: This is a Node.js server that uses Express and Socket.IO to handle real-time communication with clients. It integrates with the Supabase database for analytics logging and the Gemini API for AI responses.
// It serves static files from the current directory and provides a health check endpoint. The server listens for incoming messages from clients, generates AI responses using the Gemini API, and logs analytics data to Supabase. It also handles client disconnections and errors gracefully.
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables
require("dotenv").config();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static("."));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  // Handle message from client
  socket.on("message", async (data) => {
    try {
      console.log("Received message:", data);

      // Track message received time for analytics
      const messageReceivedTime = new Date();

      // Generate response using Gemini API
      const response = await generateAIResponse(
        data.message,
        data.geminiApiKey || process.env.gemini
      );

      // Calculate response time for analytics
      const responseTime = new Date() - messageReceivedTime;

      // Send response back to client
      socket.emit("message_response", {
        conversationId: data.conversationId,
        message: response,
      });

      // Log analytics data
      await logAnalytics({
        conversation_id: data.conversationId,
        session_id: data.sessionId,
        email: data.email,
        message: data.message,
        response: response,
        response_time_ms: responseTime,
      });
    } catch (error) {
      console.error("Error processing message:", error);

      // Send error response
      socket.emit("message_response", {
        conversationId: data.conversationId,
        message:
          "I'm sorry, I couldn't process your request. Please try again later.",
      });
    }
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/**
 * Generate AI response using Gemini API
 */
async function generateAIResponse(message, apiKey) {
  try {
    // Initialize Gemini API with the provided key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a helpful assistant of . Answer the following question: ${message}`;
    // Generate content
    const result = await model.generateContent(message);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm sorry, I encountered an error while processing your message. Please try again later.";
  }
}

/**
 * Log analytics data to Supabase
 */
async function logAnalytics(data) {
  try {
    const { error } = await supabase.from("analytics").insert([data]);

    if (error) throw error;

    console.log("Analytics data logged successfully");
  } catch (error) {
    console.error("Error logging analytics:", error);
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
