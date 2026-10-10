#!/usr/bin/env node
/**
 * Patch local do `@stryker-mutator/vitest-runner` para o Vitest 5.
 *
 * Causa raiz: `collectTestName` junta os nomes do `describe`/`it` com um
 * espaço (`nameParts.join(' ')`), mas o `testNamePattern` do Vitest 5 casa a
 * cadeia com `' > '`. O filtro por-teste do runner não encontra nenhum teste,
 * então mutantes cobertos rodam 0 testes e são reportados como "Survived" —
 * a suíte de mutação vira ruído (medido: painel ~3% de score).
 *
 * Correção upstream #6214 (issue #6210), ainda NÃO publicada no npm (10.0.0 é
 * a última versão). Enquanto não houver release, este script reaplica o patch
 * depois do `npm install`/`npm ci`.
 *
 * Idempotente e tolerante: se os arquivos já estão corrigidos, ou se a versão
 * instalada não tem os arquivos esperados (upstream já corrigiu), sai 0 sem
 * tocar em nada.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const BAD = "nameParts.join(' ')";
const GOOD = "nameParts.join(' > ')";

function resolveDistDir() {
  try {
    const pkg = require.resolve("@stryker-mutator/vitest-runner/package.json");
    return join(dirname(pkg), "dist", "src");
  } catch {
    return null;
  }
}

const distDir = resolveDistDir();
if (distDir === null) {
  console.log("[patch-stryker-vitest5] vitest-runner não instalado — nada a fazer.");
  process.exit(0);
}

const targets = ["test-helpers.js", "stryker-setup.js"].map((name) =>
  join(distDir, name)
);

let patched = 0;
for (const file of targets) {
  if (!existsSync(file)) {
    continue;
  }
  const source = readFileSync(file, "utf8");
  if (!source.includes(BAD)) {
    continue; // já corrigido (ou upstream publicou a correção).
  }
  writeFileSync(file, source.split(BAD).join(GOOD), "utf8");
  patched += 1;
  console.log(`[patch-stryker-vitest5] corrigido: ${file}`);
}

if (patched === 0) {
  console.log(
    "[patch-stryker-vitest5] já corrigido ou não aplicável — nada a fazer."
  );
} else {
  console.log(`[patch-stryker-vitest5] ${patched} arquivo(s) corrigido(s).`);
}
