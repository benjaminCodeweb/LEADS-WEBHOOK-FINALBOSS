import express from 'express';
import { chat } from './chatgpt.js';
import axios from 'axios';
import "dotenv/config";



const app = express();
const PORT = process.env.PORT || 8080;
const jwtToken ='EAAS0KmWP1MgBPOvSLeRVxnZAs6ZAi0ZCuIrkdgWryX1GtYpApHhK2VhgrbwfigUt3GmeCYE7Cf9KiyagzKKuuZBjoxLI8oHZAqyx2ZCKCZAZAph5pC8yo9RCoww5XvsASO5UsU4nxWMugmJRfhCD72K66mRHDSeivMw48KBTTqarbDZAf2qeRpekAK74M6eBiiYLTZBwZDZD'
const WHATSAPP_API_URL=`https://graph.facebook.com/v19.0/${process.env.numberId}/messages`;
const threadsPorUsuario = new Map();

app.use(express.json());

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'benja123';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('🟢 Webhook verificado correctamente');
    return res.status(200).send(challenge);
  } else {
    console.log('🔴 Falló la verificación del webhook');
    return res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const msgBody = message.text?.body;
      let thread = threadsPorUsuario.get(from); 
      console.log('📩 Mensaje recibido:', msgBody);

      try {
        const respuesta = await chat( msgBody, from, thread);

         if (!thread && respuesta?.thread?.id) {
           threadsPorUsuario.set(from, respuesta.thread); // guardás solo si es nuevo
          }  // si tu función recibe así
        console.log('💬 Respuesta generada:', respuesta);
        
        if (respuesta?.response) {
          await axios.post(
            WHATSAPP_API_URL,
            {
              messaging_product: 'whatsapp',
              to: from,
              type: 'text',
              text: {
                body: respuesta.response
              }
            },
            {
              headers: {
                Authorization: `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        }
      } catch (err) {
        console.error('⚠️ Error llamando a chat() o enviando mensaje:', err.response?.data || err.message);
      }
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});