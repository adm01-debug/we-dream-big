import { PERMISSION_MATRIX, resolvePaths } from "../fixtures/permissions-matrix";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

/**
 * Schema de validação para a fixture gerada.
 * Garante que o JSON final tenha os papéis corretos e listas separadas de URLs.
 */
const UrlFixtureSchema = z.record(
  z.enum(["publico", "agente", "supervisor", "dev"]),
  z.object({
    valid: z.array(z.string().startsWith("/")),
    invalid: z.array(z.string().startsWith("/")),
  })
);

/**
 * Script para gerar automaticamente um arquivo de fixtures estáticas 
 * contendo todas as URLs resolvidas a partir da matriz de permissões.
 * 
 * Inclui validação contra duplicidades e garantia de resolução de parâmetros,
 * além de gerar automaticamente variações negativas (invalid params) para testes de robustez.
 * 
 * Separa as URLs em seções 'valid' e 'invalid' para facilitar o consumo nos testes.
 */
function generateUrlFixtures() {
  const output: Record<string, { valid: string[]; invalid: string[] }> = {};
  const totalStats = { total: 0, unique: 0, parameterized: 0, generatedNegative: 0 };

  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];
    
    for (const route of routes) {
      const paths = resolvePaths(route);
      
      // Organiza por comportamento esperado (baseado na matriz original)
      if (route.expectedBehavior === 'allow') {
        validUrls.push(...paths);
      } else {
        invalidUrls.push(...paths);
      }
      
      if (route.path.includes(':')) {
        totalStats.parameterized++;
        
        // Gerador Automático de Cenários Negativos Combinados (Invalid Params)
        const paramNames = (route.path.match(/:[a-zA-Z0-9]+/g) || []).map(p => p.replace(':', ''));
        
        if (paramNames.length > 0 && route.expectedBehavior === 'allow') {
          const validBase = Array.isArray(route.params) ? route.params[0] : (route.params || {});
          
          paramNames.forEach(targetParam => {
            const mixedParams: Record<string, string> = { ...validBase };
            mixedParams[targetParam] = `invalid-${targetParam}-auto`;
            
            let mixedPath = route.path;
            for (const [key, value] of Object.entries(mixedParams)) {
              mixedPath = mixedPath.split(`:${key}`).join(value);
            }
            if (!invalidUrls.includes(mixedPath)) {
              invalidUrls.push(mixedPath);
              totalStats.generatedNegative++;
            }
          });

          if (paramNames.length > 1) {
            let allInvalidPath = route.path;
            paramNames.forEach(name => {
              allInvalidPath = allInvalidPath.split(`:${name}`).join(`invalid-${name}-all-auto`);
            });
            if (!invalidUrls.includes(allInvalidPath)) {
              invalidUrls.push(allInvalidPath);
              totalStats.generatedNegative++;
            }
          }
        }
      }
    }

    // Validação de duplicidades por papel e seção
    const finalValid = [...new Set(validUrls)];
    const finalInvalid = [...new Set(invalidUrls)];

    if (finalValid.length !== validUrls.length || finalInvalid.length !== invalidUrls.length) {
      console.warn(`⚠️ Aviso: Duplicidades detectadas para o papel [${role}]. Removendo...`);
    }

    output[role] = {
      valid: finalValid,
      invalid: finalInvalid
    };
    totalStats.total += (validUrls.length + invalidUrls.length);
    totalStats.unique += (finalValid.length + finalInvalid.length);
  }

  const filePath = path.join(process.cwd(), "e2e", "fixtures", "generated-urls.json");
  
  fs.writeFileSync(
    filePath,
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  console.log(`✅ Fixture de URLs gerada com sucesso em: ${filePath}`);
  console.log(`📊 Estatísticas: ${totalStats.unique} URLs únicas geradas (${totalStats.parameterized} rotas base parametrizadas resolvidas).`);

  // Validação final de integridade
  for (const [role, data] of Object.entries(output)) {
    const unresolved = [...data.valid, ...data.invalid].filter(url => url.includes(':'));
    if (unresolved.length > 0) {
      throw new Error(`❌ Erro crítico: Rotas não resolvidas detectadas para o papel [${role}]: ${unresolved.join(', ')}`);
    }
  }

  // Validação de Schema via Zod
  try {
    UrlFixtureSchema.parse(output);
    console.log("✅ Schema validado com sucesso via Zod.");
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("❌ Falha na validação do schema JSON:", err.errors);
    }
    throw err;
  }
}

// Executa se chamado diretamente
if (import.meta.url.endsWith(process.argv[1])) {
  generateUrlFixtures();
}

export { generateUrlFixtures };
