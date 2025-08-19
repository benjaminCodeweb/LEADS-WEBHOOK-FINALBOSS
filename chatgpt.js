import OpenAI from 'openai';
import { config } from './index.js';
import { guardarLeadEnSheets } from './guardarReserva.js';





const openaiApiKey = config.openAiKey;
const assistant = config.assistaint;
 



  
 async function hayRunActivo(openai, threadId) {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    return runs.data.some(run => run.status === 'in_progress' || run.status === 'queued');
  } catch (error) {
    console.error('Error al verificar runs activos:', error.message);
    return false;
  }
}



export const chat = async (question, name, thread = null) => {
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Crear thread si no hay
    if (!thread || typeof thread !== 'object' || !thread.id) {
      thread = await openai.beta.threads.create();
    } 

      if (await hayRunActivo(openai, thread.id)) {
      console.warn('🛑 Run activo detectado. Se evita ejecución simultánea.');
      return {
        thread: { id: thread.id },
        response: '⏳ Estoy procesando tu mensaje anterior, dame un momento antes de continuar.'
      };
    }

    // Enviar mensaje del usuario
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: typeof question === 'string' ? question : JSON.stringify(question)
    });

  
    // Ejecutar el run con instrucciones
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant,
   instructions: `Sos el asistente virtual de Automatizate Ya. Tu tarea es ayudar a los clientes a:

- Compartir Nombre
- Apellido
- Teléfono
- Confirmar si están interesados en que los contacte

Siempre respondé con amabilidad, claridad y una actitud profesional y cálida.

ℹ️ Presentación breve:
Explicá de forma simple y atractiva que Benjamin ayuda a empresas y emprendedores a crecer mediante chatbots y automatizaciones con inteligencia artificial, que mejoran ventas, soporte y eficiencia.  
Usá un tono cercano y profesional, mostrando que es un servicio personalizado y de confianza. 

🧠 FUNCIONES DISPONIBLES:

guardarLeadEnSheets: guarda una fila en Google Sheets con nombre, apellido, teléfono e interesado

✅ FLUJO:

Cuando el cliente inicie conversación o muestre interés, en un solo mensaje:
- Presentate como el asistente virtual de Benjamin y contá en 1-2 frases qué hace (chatbots, automatizaciones con IA para ventas/soporte, optimización de procesos).
- Dile si tiene alguna duda al respecto. 
- Pedí los datos:  
  • Nombre  
  • Apellido  
  • Teléfono   
  • Confirmación de interés (“¿Estás interesado/a en que te contacte para mas informacion?”)  

Una vez recibidos:

- Validá mínimamente el teléfono (que sea legible; ideal E.164, pero no bloquees si no).  
- Si responde afirma:  
  - Mostrá un resumen en un solo mensaje: Nombre + Apellido + Teléfono  
  - Ejecutá 'guardarLeadEnSheets' (solo si hay interés y confirmación).  
  - Luego confirmá con un mensaje cálido que los datos fueron registrados y recordá brevemente el beneficio de trabajar con Automatizate Ya.  
- Si responde negativo:  
  - Agradecé cordialmente y no guardes nada.  
- Si falta un dato, pedí solo lo que falta sin repetir todo.  

🔒 CONFIRMACIONES ANTES DE USAR FUNCIONES:

⚠️ Solo pedí confirmación del cliente antes de ejecutar 'guardarLeadEnSheets'.  
No uses frases como “voy a verificar” o “permíteme un momento”.  
No repitas los datos en varios mensajes: consolidá en uno solo.  
 
`
});
    
    //agregie si requiere de la accion 
    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

      console.log('Tool calls recibidos:', toolCalls);
      for (const toolCall of toolCalls) {
        const { name, arguments: argsRaw } = toolCall.function;
        const {id: toolCallId } = toolCall
        
       let args;
            try {
              if (!argsRaw) {
                throw new Error('argsRaw está vacío o undefined');
              }
              args = JSON.parse(argsRaw);
            } catch (error) {
              console.error('⚠️ Error al parsear los datos:', error.message);
              continue; // Saltea este toolCall
            }
        let result = null;

          if (name === 'insertarDatosGS') {
              const datos  = await guardarLeadEnSheets(args);
           
              if (datos.error) {
              result = datos;
            }
          }
        
        if (!thread || !thread.id || typeof thread.id !== 'string') {
          throw new Error('❌ Faltó thread.id válido al momento de enviar tool_outputs');
        }
        await openai.beta.threads.runs.submitToolOutputs( run.id, {
          thread_id: thread.id,
          tool_outputs: [{
            tool_call_id: toolCallId,
            output: JSON.stringify(result),
           
          }]
        });
      }
         
     // Esperar a que finalice la ejecución después de usar tools
  let finalRun;

do {
  try {
    const runsList = await openai.beta.threads.runs.list(thread.id);
    finalRun = runsList.data[0];
  } catch (e) {
    console.error('❌ Error al esperar run final:', e.message);
    return {
      thread: { id: thread.id },
      response: '⚠️ Ocurrió un error al intentar obtener la respuesta del asistente. Por favor, intentá de nuevo.'
    };
  }
} while (finalRun?.status === 'in_progress' || finalRun?.status === 'queued');
        if (finalRun.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const lastMsg = messages.data
            .filter(m => m.role === 'assistant' && m.run_id === finalRun.id)
            .pop()?.content?.[0]?.text?.value;

          const responseText = lastMsg ?? 'No se recibió respuesta del asistente.';

          return {
            thread: { id: thread.id },
            response: responseText
          };
        } else {
          console.warn('⚠️ Final run no se completó correctamente. Estado:', finalRun.status);
          return {
            thread: { id: thread.id },
            response: '⚠️ La operación se ejecutó pero no se pudo obtener la respuesta del asistente.'
          };
}

    }

      //si se completa la ejecutcion 
   if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      for (const message of messages.data.reverse()) {
        console.log(`Mensaje GS: ${message.role} > ${message.content[0].text.value}`);

      } 
    
       const assistaintResponse = messages.data
      .filter(message => message.role === 'assistant' && message.run_id === run.id)
      .pop();

      const answer = assistaintResponse ? assistaintResponse.content[0].text.value : null
      const cleanAnswer = answer//replace(/ [\d+:\d+source] /g, '');
      return {
        thread: { id: thread.id },
        response: cleanAnswer
      };
      

    }
    return  {  thread: { id: thread.id }, response: null};
  } catch(error) {
    console.error('Error al conectar con OpenAi', error.message);
    return {
      thread: { id: thread?.id || null },
      response: null
    } 
  } 
} 
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});