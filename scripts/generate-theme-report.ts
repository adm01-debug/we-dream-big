import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE = path.join(process.cwd(), 'playwright-report', 'theme-validation-data.json');
const HTML_FILE = path.join(process.cwd(), 'playwright-report', 'theme-validation-report.html');
const CSV_FILE = path.join(process.cwd(), 'playwright-report', 'theme-validation-report.csv');

interface Failure {
  preset: string;
  mode: string;
  route: string;
  type: string;
  details: string;
}

if (!fs.existsSync(JSON_FILE)) {
  console.error('Nenhum dado de validação encontrado. Rode os testes primeiro.');
  process.exit(1);
}

const failures: Failure[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

// Gerar CSV
const csvHeader = 'Preset,Mode,Route,Type,Details\n';
const csvRows = failures.map(f => `"${f.preset}","${f.mode}","${f.route}","${f.type}","${f.details.replace(/"/g, '""')}"`).join('\n');
fs.writeFileSync(CSV_FILE, csvHeader + csvRows);

// Gerar HTML
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Validação de Temas</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f4f4f9; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #333; color: #fff; }
        tr:hover { background: #f1f1f1; }
        .type-contrast { color: #d9534f; font-weight: bold; }
        .type-typography { color: #f0ad4e; font-weight: bold; }
        .success { color: #5cb85c; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Relatório de Validação de Temas (SKINs)</h1>
    <p>Total de falhas encontradas: <strong>${failures.length}</strong></p>
    
    ${failures.length === 0 ? '<p class="success">Nenhuma falha detectada! Todas as skins estão consistentes.</p>' : `
    <table>
        <thead>
            <tr>
                <th>Preset</th>
                <th>Modo</th>
                <th>Rota</th>
                <th>Tipo</th>
                <th>Detalhes</th>
            </tr>
        </thead>
        <tbody>
            ${failures.map(f => `
                <tr>
                    <td>${f.preset}</td>
                    <td>${f.mode}</td>
                    <td>${f.route}</td>
                    <td><span class="type-${f.type}">${f.type.toUpperCase()}</span></td>
                    <td>${f.details}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    `}
</body>
</html>
`;

fs.writeFileSync(HTML_FILE, htmlContent);

console.log(`Relatórios gerados com sucesso:\n- ${HTML_FILE}\n- ${CSV_FILE}`);
