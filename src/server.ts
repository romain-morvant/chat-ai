import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { StreamChat } from "stream-chat";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialisation du Stream Client
const chatClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

// Initialisation d'OpenAI - GPT4
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log(openai);

// Inscription d'un utilisateur avec Stram Chat
app.post(
  "/register-user",
  async (req: Request, res: Response): Promise<any> => {
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ error: "Le nom et le mail sont obligatoires." });
    }

    try {
      const userId = email.replace(/[^a-zA-Z0-9_-]/g, "_");

      // Vérification de l'éxistance de l'utilisateur
      const userResponse = await chatClient.queryUsers({ id: { $eq: userId } });

      // Si l'utilisateur n'est pas inscrit
      if (!userResponse.users.length) {
        // Inscription de l'utilisateur au stream
        await chatClient.upsertUser({
          id: userId,
          name: name,
          email: email,
          role: "user",
        });
      }

      res.status(200).json({ userId, name, email });
    } catch (error) {
      res.status(500).json({ error: "Erreur interne du serveur." });
    }
  }
);

// Envoi de message à l'IA
app.post("/chat", async (req: Request, res: Response): Promise<any> => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res
      .status(400)
      .json({ error: "Le message et l'utilisateur sont obligatoires." });
  }

  try {
    // Vérification de l'éxistance de l'utilisateur
    const userResponse = await chatClient.queryUsers({ id: userId });
    if (!userResponse.users.length) {
      return res.status(404).json({
        error: "Utilisateur introuvable. Veuillez d'abord vous inscrire.",
      });
    }

    // Envoi du message à OpenAI GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    });

    console.log(response);
    res.send("Réussite !");
  } catch (error) {
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Serveur éxécuté sur le port ${PORT}`));
