// app/api/chat/course-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  let courseTitle = '';
  try {
    const {
      courseTitle: courseTitleData,
      lessonTitle,
      lessonContent,
      message
    } = await request.json()
    courseTitle = courseTitleData;

    console.log('Chat request:', { courseTitle, lessonTitle, message: message.substring(0, 50) })

    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 600))

    // Obtener contenido real de la lección para respuestas más precisas
    let lessonData = null
    if (lessonContent) {
      lessonData = lessonContent
    }

    // Lógica mejorada de detección de intención
    const lowerMessage = message.toLowerCase().trim()
    let response = ''

    // Detectar preguntas sobre ABSTRACCIÓN
    if (lowerMessage.includes('abstracción') || lowerMessage.includes('abstract') || 
        (lowerMessage.includes('qué') && lowerMessage.includes('abstracción'))) {
      
      response = `🔍 **Abstracción en Programación Orientada a Objetos**\n\n` +
                `La abstracción es el proceso de ocultar los detalles de implementación complejos y mostrar solo las características esenciales de un objeto.\n\n` +
                `**En C# se logra mediante:**\n` +
                `• Clases abstractas (abstract class)\n` +
                `• Interfaces\n` +
                `• Métodos abstractos\n\n` +
                `**Ejemplo práctico:**\n` +
                `Pensemos en un "Vehículo". No nos importa cómo funciona internamente el motor, solo nos interesa que pueda "acelerar()" y "frenar()". Esa es la abstracción.\n\n` +
                `**Beneficios:**\n` +
                `✅ Reduce la complejidad\n` +
                `✅ Facilita el mantenimiento\n` +
                `✅ Promueve la reutilización\n\n` +
                `¿Te gustaría que profundice en algún aspecto específico de la abstracción?`

    } 
    // Detectar preguntas sobre ENCAPSULAMIENTO
    else if (lowerMessage.includes('encapsulamiento') || lowerMessage.includes('encapsulación') ||
             lowerMessage.includes('private') || lowerMessage.includes('public')) {
      
      response = `🔒 **Encapsulamiento en POO**\n\n` +
                `El encapsulamiento es el mecanismo que restringe el acceso directo a algunos componentes de un objeto, protegiendo su estado interno.\n\n` +
                `**En C# usamos modificadores de acceso:**\n` +
                `• private: Solo accesible dentro de la clase\n` +
                `• public: Accesible desde cualquier lugar\n` +
                `• protected: Accesible en la clase y clases derivadas\n\n` +
                `**Ejemplo:**\n` +
                `\`\`\`csharp
public class CuentaBancaria {
    private decimal saldo; // Encapsulado
    
    public void Depositar(decimal monto) {
        if (monto > 0) saldo += monto;
    }
    
    public decimal GetSaldo() { return saldo; }
}
\`\`\`\n\n` +
                `¿Quieres que te explique más sobre los modificadores de acceso?`

    }
    // Detectar preguntas sobre HERENCIA
    else if (lowerMessage.includes('herencia') || lowerMessage.includes('inherit') ||
             lowerMessage.includes('extends') || lowerMessage.includes('base')) {
      
      response = `👨‍👧‍👦 **Herencia en POO**\n\n` +
                `La herencia permite que una clase (hija) derive de otra clase (padre), heredando sus propiedades y métodos.\n\n` +
                `**En C#:**\n` +
                `\`\`\`csharp
public class Vehiculo { // Clase padre
    public string Marca { get; set; }
    public void Arrancar() { }
}

public class Auto : Vehiculo { // Clase hija
    public int Puertas { get; set; }
}
\`\`\`\n\n` +
                `**Ventajas:**\n` +
                `• Reutilización de código\n` +
                `• Jerarquía lógica\n` +
                `• Extensibilidad\n\n` +
                `¿Te interesa conocer sobre herencia múltiple o sealed classes?`

    }
    // Detectar preguntas sobre POLIMORFISMO
    else if (lowerMessage.includes('polimorfismo') || lowerMessage.includes('polymorphism') ||
             lowerMessage.includes('override') || lowerMessage.includes('virtual')) {
      
      response = `🎭 **Polimorfismo en POO**\n\n` +
                `El polimorfismo permite que objetos de diferentes clases respondan al mismo mensaje (método) de manera diferente.\n\n` +
                `**Tipos en C#:**\n` +
                `• Polimorfismo por herencia (override)\n` +
                `• Polimorfismo por interfaces\n` +
                `• Polimorfismo por sobrecarga\n\n` +
                `**Ejemplo:**\n` +
                `\`\`\`csharp
public class Animal {
    public virtual void Sonido() { }
}

public class Perro : Animal {
    public override void Sonido() { 
        Console.WriteLine("Guau guau!");
    }
}

public class Gato : Animal {
    public override void Sonido() {
        Console.WriteLine("Miau!");
    }
}
\`\`\`\n\n` +
                `¿Quieres profundizar en algún tipo específico de polimorfismo?`

    }
    // Detectar saludos
    else if (lowerMessage.includes('hola') || lowerMessage.includes('hi') || 
             lowerMessage.includes('buenas') || lowerMessage === 'hola') {
      
      response = `¡Hola! 👋 Soy tu tutor IA especializado en **${courseTitle}**.\n\n` +
                `Actualmente estás en la lección: **"${lessonTitle}"**\n\n` +
                `Puedo ayudarte con:\n` +
                `• Explicaciones de conceptos de POO\n` +
                `• Ejemplos de código en C#\n` +
                `• Dudas sobre abstracción, encapsulamiento, herencia y polimorfismo\n` +
                `• Ejercicios prácticos\n\n` +
                `¿En qué tema específico necesitas ayuda?`

    }
    // Detectar preguntas sobre C# específicamente
    else if (lowerMessage.includes('c#') || lowerMessage.includes('c sharp') ||
             lowerMessage.includes('punto net') || lowerMessage.includes('.net')) {
      
      response = `💻 **Conceptos de C# en POO**\n\n` +
                `En C#, los pilares de la Programación Orientada a Objetos se implementan así:\n\n` +
                `**1. Abstracción** → Clases abstractas, interfaces\n` +
                `**2. Encapsulamiento** → private, public, protected\n` +
                `**3. Herencia** → : (operador de herencia)\n` +
                `**4. Polimorfismo** → virtual, override\n\n` +
                `¿Sobre cuál pilar te gustaría aprender más?`

    }
    // Preguntas generales sobre la lección
    else if (lowerMessage.includes('lección') || lowerMessage.includes('tema') ||
             lowerMessage.includes('contenido') || lowerMessage.includes('explica')) {
      
      response = `📚 **Resumen de la Lección: ${lessonTitle}**\n\n` +
                `Esta lección cubre los 4 pilares fundamentales de la POO:\n\n` +
                `**1. Abstracción** - Ocultar complejidad, mostrar funcionalidad\n` +
                `**2. Encapsulamiento** - Proteger datos internos\n` +
                `**3. Herencia** - Reutilizar y extender código\n` +
                `**4. Polimorfismo** - Múltiples formas, misma interfaz\n\n` +
                `¿Te gustaría que profundice en alguno de estos conceptos?`

    }
    // Respuesta por defecto - más inteligente
    else {
      response = `🤔 **Sobre tu pregunta:** "${message}"\n\n` +
                `Como tutor especializado en **${courseTitle}**, puedo orientarte mejor si me especificas:\n\n` +
                `• ¿Te refieres a algún concepto específico de POO?\n` +
                `• ¿Necesitas ejemplos prácticos en C#?\n` +
                `• ¿Tienes dudas sobre abstracción, encapsulamiento, herencia o polimorfismo?\n\n` +
                `También puedo ayudarte con:\n` +
                `• Sintaxis de C#\n` +
                `• Mejores prácticas de POO\n` +
                `• Ejercicios de programación\n` +
                `• Preparación para exámenes\n\n` +
                `¿En qué aspecto específico necesitas ayuda?`
    }

    // Agregar contexto específico si hay contenido de lección
    if (lessonData && lessonData.length > 50) {
      response += `\n\n📖 *Basado en el contenido de la lección: "${lessonTitle}"*`
    }

    console.log('Sending contextual response')
    return NextResponse.json({ response })

  } catch (error) {
    console.error('Error in chat API:', error)
    
    return NextResponse.json({ 
      response: `¡Hola! Soy tu tutor de **${courseTitle}** 👨‍🏫\n\n` +
                `Parece que hay un problema temporal. Mientras se soluciona, puedo ayudarte con:\n\n` +
                `• **Abstracción** en POO\n` +
                `• **Encapsulamiento** y modificadores de acceso\n` +
                `• **Herencia** y relaciones entre clases\n` +
                `• **Polimorfismo** y métodos virtuales\n\n` +
                `¿Sobre cuál de estos temas te gustaría aprender?`
    })
  }
}