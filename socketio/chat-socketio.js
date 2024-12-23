const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const axios = require("axios"); // Importar axios para a comunicação com a API da OpenAI
require('dotenv').config(); // Carregar variáveis de ambiente, incluindo a chave da OpenAI
const bodyParser = require('body-parser'); // Importar bodyParser para tratar JSON

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const path = require('path');

// Middleware para interpretar o body das requisições como JSON
app.use(bodyParser.json());

io.on("connection", (socket) => {
  console.log("Usuário conectado " + socket.id);

  // Quando uma mensagem for enviada
  socket.on("message", async (msg) => {
    console.log(msg);

    // Verificar se o comando /text foi usado
    if (msg.text.startsWith("/text ")) {
      const userMessage = msg.text.replace("/text ", ""); // Extrair mensagem do comando /text

      // Chamar a API da OpenAI
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: userMessage }],
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Use a chave da API da OpenAI
            },
          }
        );

        const botResponse = response.data.choices[0].message.content; // Resposta da OpenAI
        // Enviar a resposta do bot para todos os clientes conectados
        io.emit("message", { text: botResponse, sender: "bot" });
      } catch (error) {
        console.error("Erro ao chamar a API da OpenAI:", error);
        io.emit("message", { text: "Erro ao gerar resposta", sender: "bot" });
      }
    } else if (msg.text.startsWith("/image ")) {
      const userMessage = msg.text.replace("/image ", ""); // Extrair mensagem do comando /image

      // Chamar a API de geração de imagens
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/images/generations',
          {
            prompt: userMessage,
            n: 1,
            size: "1024x1024",
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Use a chave da API da OpenAI
            },
          }
        );

        const imageUrl = response.data.data[0].url; // Obter URL da imagem gerada

        // Enviar a URL da imagem para todos os clientes conectados
        io.emit("message", { text: imageUrl, type: "image", sender: "bot" });
      } catch (error) {
        console.error("Erro ao chamar a API da OpenAI para imagens:", error);
        io.emit("message", { text: "Erro ao gerar imagem", sender: "bot" });
      }
    } else {
      // Enviar a mensagem normalmente (sem o comando /text)
      io.emit("message", msg);
    }
  });
});

// Endpoint /openai/chat para outras requisições externas se necessário
app.post('/openai/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const botResponse = response.data.choices[0].message.content;
    res.json({ response: botResponse });
  } catch (error) {
    console.error("Erro ao chamar a API da OpenAI:", error);
    res.status(500).json({ error: "Erro ao gerar resposta" });
  }
});

app.use(express.static(path.join(__dirname,)));

// Rota principal para carregar o login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Rota para o chat (após login)
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat-socketio.html'));
});

// Iniciar o servidor
server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
