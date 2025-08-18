import { addKeyword } from "@builderbot/bot";
import { chat } from '../server/chatgpt';

export const mainFlow = addKeyword([".*"])
  .addAction(async (ctx, ctxFn) => {
    console.log("Mensaje recibido:", ctx.body); // <-- Aquí

    const state = await ctxFn.state.getMyState();
    const thread = state?.thread ?? null;

   const response = await chat(ctx.body, ctx.name, thread)


    console.log("Respuesta del asistente:", response); // <-- Aquí

    await ctxFn.state.update({ thread: response.thread });
    return ctxFn.endFlow(response.response || 'error al conectar')
  });