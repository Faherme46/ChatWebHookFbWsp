"use strict";

// Token de acceso para tu aplicación
// (copia el token de la página de inicio de DevX
// y guárdalo como variable de entorno en el archivo .env)
const token = process.env.WHATSAPP_TOKEN;

// Importa las dependencias y configura el servidor HTTP
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // crea un servidor HTTP Express

// Establece el puerto del servidor y muestra un mensaje en caso de éxito
app.listen(process.env.PORT || 1337, () =>
  console.log("El webhook está escuchando")
);

// Acepta solicitudes POST en el punto final /webhook
app.post("/webhook", (req, res) => {
  // Analiza el cuerpo de la solicitud POST
  let body = req.body;

  // Comprueba el mensaje del webhook de WhatsApp entrante
  console.log(JSON.stringify(req.body, null, 2));

  // Información sobre la carga útil de mensajes de texto de WhatsApp: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extrae el número de teléfono de la carga útil del webhook
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extrae el texto del mensaje de la carga útil del webhook

      let data = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "ERES UN ASISTENTE.",
          },
          {
            role: "user",
            content: msg_body,
          },
        ],
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer $OPENAI_API_KEY",
        },
        data: data,
      };

      axios
        .request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data));
        })
        .catch((error) => {
          console.log(error);
        });

      axios({
        method: "POST", // Requerido, método HTTP, una cadena, p. ej., POST, GET
        url:
          "https://graph.facebook.com/v12.0/" +
          phone_number_id +
          "/messages?access_token=" +
          token,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: "Bot conectado con webhook de prueba: " + msg_body },
        },
        headers: { "Content-Type": "application/json" },
      });
    }
    res.sendStatus(200);
  } else {
    // Devuelve un '404 No encontrado' si el evento no proviene de una API de WhatsApp
    res.sendStatus(404);
  }
});

// Acepta solicitudes GET en el punto final /webhook. Necesitas esta URL para configurar el webhook inicialmente.
app.get("/webhook", (req, res) => {
  /**
   * ACTUALIZA TU TOKEN DE VERIFICACIÓN
   * Este será el valor del Token de Verificación cuando configures el webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Analiza los parámetros de la solicitud de verificación del webhook
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Comprueba si se envió un token y el modo
  if (mode && token) {
    // Comprueba que el modo y el token enviados sean correctos
    if (mode === "subscribe" && token === verify_token) {
      // Responde con un código 200 OK y el token de desafío de la solicitud
      console.log("VERIFICACIÓN DE WEBHOOK");
      res.status(200).send(challenge);
    } else {
      // Responde con un '403 Prohibido' si los tokens de verificación no coinciden
      res.sendStatus(403);
    }
  }
});