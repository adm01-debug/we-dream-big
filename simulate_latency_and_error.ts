import { supabase } from './src/integrations/supabase/client';

// Use a self-invoking async function to run the simulation
(async () => {
  console.log("--- INICIANDO SIMULAÇÃO DE CARREGAMENTO LENTO E ERRO ---");

  // Monkey-patching supabase.functions.invoke to simulate delay and errors
  const originalInvoke = supabase.functions.invoke;
  
  supabase.functions.invoke = async function(functionName: string, options?: any) {
    console.log(`[Simulation] Intercepting call to edge function: ${functionName}`);
    
    // Simulate latency (3 seconds)
    console.log("[Simulation] Adding 3s artificial latency...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate random error (20% chance)
    if (Math.random() < 0.2) {
      console.error("[Simulation] Injecting artificial API error!");
      return { data: null, error: { message: "Artificial latency/error simulation active", status: 500 } as any };
    }
    
    return originalInvoke.apply(this, [functionName, options]);
  };

  console.log("--- SIMULAÇÃO ATIVA ---");
  console.log("As chamadas para Edge Functions agora possuem 3s de atraso e 20% de chance de erro.");
  console.log("Navegue pelo app para validar os skeletons.");
})();
