# Admin Relatórios/Documentos Specification

## Problem Statement

A igreja Virtude Cristã precisa de um módulo **Relatórios/Documentos** no painel
administrativo para (i) exportar relatórios financeiros (receitas, despesas, caixa)
e de gestão (membros, eventos, patrimônio) em CSV, e (ii) gerir documentos — upload
manual de arquivos (PDF, planilhas) com categoria por módulo, lista com download e
exclusão. Hoje os dados existem nos módulos RF-022..026, mas não há forma de extrair
visões consolidadas nem histórico de arquivos no painel — a liderança baixa telas ou
usa tabelas externas.

## Goals

- [ ] Exportação de relatórios financeiros (período/categoria) e de gestão em CSV `;` + BOM
- [ ] Upload de documentos com categorias por módulo e validação de tipo/tamanho
- [ ] Listagem, download e exclusão de documentos (download para leitores; escrita para escritores)
- [ ] Controle de acesso via RBAC módulo `relatorios` (FINANCEIRO escreve; leitores lêem/baixam)

## Out of Scope

| Feature | Reason |
| --------- | -------------- |
| Relatório mensal agendado automaticamente | Entra em iteração futura (requer cron/Edge Function) — contexto RF-027 |
| Exportação em PDF | Iteração futura; CSV cobre o MVP (contexto RF-027) |
| Relatórios de auditoria/usuários | RF-029/RF-030 tratam esses módulos separadamente |
| Relatórios com gráficos | Gráficos da dashboard (RF-021) são feature própria; aqui só exportação |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Relatórios do MVP: financeiro + gestão | Financeiro (receitas/despesas/caixa) + membros/eventos/patrimônio | Atende o deferido pela spec financeiro e a árvore RF-027 "relatórios"; volume baixo (AD-001) | y (decisão do usuário 2026-09-15) |
| Formato de exportação: CSV | CSV separado por `;`, UTF-8 BOM | Abre no Excel PT-BR; sem lib nova; RNF-007 custo R$0 | y (decisão do usuário) |
| Período: filtro | Financeiro com data início/fim (padrão último mês); gestão com filtro opcional | Contexto RF-027; alinha com AD-016 (GET + searchParams server-side) | y (decisão do usuário) |
| Documentos = upload manual | Arquivos PDF/planilhas com metadados em `documents`; bucket privado | SECURITY.md: documentos restritos a papéis com permissão | y (decisão do usuário) |
| Categorias de documento por módulo | Enum fixo FINANCEIRO/MEMBROS/EVENTOS/PATRIMONIO/IGREJAS/GERAL | Contexto RF-027; filtro por categoria na listagem | y (decisão do usuário) |
| Download de documento exige leitura (não escrita) | Leitores do módulo (SECRETARIA/PATRIMONIAL/LIDER) baixam; escrita só FINANCEIRO/ADMIN/SA | Matriz 0008: relatorios ler/escrever; download é operação de leitura | y (implícito na matriz) |
| Geração dos relatórios é sob demanda (sem arquivar) | Rota GET devolve CSV direto ao navegador | Sem estado de relatório persistido; download nativo via Content-Disposition | y (decisão do usuário) |
| Upload máximo 10MB | `file_size_limit=10485760` no bucket + validação server-side | Razoável p/ PDF/planilhas; evita abuso de storage | y (agente) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Exportação de relatórios CSV ⭐ MVP

**User Story**: As a FINANCEIRO (and readers), I want to export financial and management reports as CSV so that the church can share and analyze data outside the panel.

**Why P1**: Reports are the core value of RF-027 — they turn existing module data into shareable views.

**Acceptance Criteria**:

1. WHEN a user with `ler` on module `relatorios` navigates to `/admin/relatorios` THEN the system SHALL display a page with two sections: Relatórios (export options) and Documentos (file list + upload)  <!-- event-driven -->
2. WHEN a user with `ler` on `relatorios` requests `GET /api/admin/relatorios/exportar?tipo=financeiro&data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD` THEN the system SHALL return a CSV file (Content-Type `text/csv; charset=utf-8`, `Content-Disposition: attachment`) with one row per financial transaction in the period, sorted by `data` desc, columns: Data;Tipo;Metodo;Status;Categoria;Descricao;Valor  <!-- event-driven -->
3. WHEN the financial report covers the requested period THEN the system SHALL append a totals row with Receitas, Despesas and Saldo computed from the filtered rows  <!-- event-driven -->
4. WHEN a user with `ler` requests `GET /api/admin/relatorios/exportar?tipo=membros` THEN the system SHALL return a CSV of members with columns Matricula;Nome;Status;Nascimento;Whatsapp;Cidade (rows ordered by `nome` asc)  <!-- event-driven -->
5. WHEN a user with `ler` requests `GET /api/admin/relatorios/exportar?tipo=eventos` THEN the system SHALL return a CSV of events with columns Titulo;Data;Hora;Local;Visivel;Status  <!-- event-driven -->
6. WHEN a user with `ler` requests `GET /api/admin/relatorios/exportar?tipo=patrimonio` THEN the system SHALL return a CSV of assets with columns Nome;Categoria;Tombo;Local;Valor Aquisicao;Data Aquisicao;Responsavel;Status  <!-- event-driven -->
7. WHEN the user requests an export with an invalid `tipo` THEN the system SHALL return 400 `{ error: "tipo_invalido" }`  <!-- unwanted-behavior -->
8. WHEN the exported CSV contains text fields with accents, quotes, or commas THEN the system SHALL quote text fields and escape embedded `"` so the file opens correctly in Excel PT-BR (UTF-8 BOM `\uFEFF` prefix, `;` separator, quoted fields)  <!-- ubiquitous -->

### P2: Documentos — upload e listagem

**User Story**: As a FINANCEIRO, I want to upload documents (PDF, spreadsheets) with a category, so that receipts and reports are archived in the panel.

**Why P2**: Documents give the panel an archive of supporting files (RN-004 audit context).

**Acceptance Criteria**:

9. WHEN a user with `escrever` on `relatorios` submits `POST /api/admin/relatorios/documentos` with multipart form fields (title, category, file) THEN the system SHALL upload the file to the private storage bucket `documentos`, persist the metadata row in `public.documents`, and return 201 with the created document  <!-- event-driven -->
10. WHEN a user with only `ler` on `relatorios` (e.g. SECRETARIA, PATRIMONIAL, LIDER) submits the upload THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->
11. WHEN a user with `ler` navigates `/admin/relatorios?categoria=<C>` THEN the system SHALL list only documents with that category, ordered by `created_at` desc; without `categoria` it SHALL list all  <!-- event-driven -->
12. WHEN the upload has empty title, invalid category, or an unsupported file type or a file larger than 10MB THEN the system SHALL return 400 `{ error: "dados_invalidos", campos: { <field>: "<message>" } }` for each invalid field  <!-- unwanted-behavior -->
13. IF uploading to storage succeeds but the `documents` insert fails THEN the system SHALL delete the uploaded object (rollback) and return 500 `{ error: "erro_interno" }` — no orphan file remains  <!-- unwanted-behavior -->

### P3: Documentos — download e exclusão

**User Story**: As a FINANCEIRO or reader, I want to download stored documents, and as a writer I want to delete them, so the archive stays useful and accurate.

**Why P3**: A document without download is useless; deletion keeps the archive clean.

**Acceptance Criteria**:

14. WHEN a user with `ler` requests `GET /api/admin/relatorios/documentos/[id]/download` THEN the system SHALL redirect (307) to a short-lived signed URL of the stored file  <!-- event-driven -->
15. WHEN the document does not exist THEN the download and delete endpoints SHALL return 404 `{ error: "nao_encontrado" }`  <!-- unwanted-behavior -->
16. WHEN a user with `escrever` requests `DELETE /api/admin/relatorios/documentos/[id]` THEN the system SHALL remove the metadata row and the storage object, and return 200 `{ ok: true }`  <!-- event-driven -->
17. WHEN a user with only `ler` requests the DELETE THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->
18. WHEN an unauthenticated user calls any `/api/admin/relatorios/*` endpoint THEN the system SHALL return 401 `{ error: "nao_autenticado" }`  <!-- unwanted-behavior -->
19. WHEN a user with `ler` on `relatorios` navigates to `/admin/relatorios` THEN the system SHALL display the upload form only for users with `escrever`, and the download link for all readers  <!-- event-driven -->

### P4: Integração dashboard e RBAC

**User Story**: As an ADMIN, I want the module reachable from the dashboard and protected by the role matrix, so that access control is consistent with the rest of the panel.

**Why P4**: The module must be discoverable and governed by the same matrix (AD-015).

**Acceptance Criteria**:

20. WHEN a user with `ler` on `relatorios` lands on `/admin` THEN the system SHALL show a "Relatórios" navigation card linking to `/admin/relatorios`  <!-- event-driven -->
21. WHEN a user without `relatorios` in the matrix (e.g. MEMBRO) requests `/admin/relatorios` THEN the system SHALL show the access-denied block (page) and redirect MEMBRO sessions to admin login via proxy  <!-- unwanted-behavior -->
22. WHEN any authenticated user without `relatorios:ler` calls the export endpoint THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->
23. The system SHALL define document categories as the fixed enum FINANCEIRO, MEMBROS, EVENTOS, PATRIMONIO, IGREJAS, GERAL, enforced by DB CHECK, used by filter and upload form  <!-- ubiquitous -->

## Edge Cases

- Nenhum documento cadastrado → seção Documentos vazia com estado "Nenhum documento cadastrado" (mensagem clara).
- Relatório financeiro sem lançamentos no período → CSV só com cabeçalho + linha de totais zerada.
- Período invertido (data_inicio > data_fim) → sistema trata como sem resultados (lista vazia; totais zerados).
- Nome de arquivo original com caracteres especiais → path de storage sempre `documentos/{uuid}.{ext}` (nunca usa nome do usuário); `file_name` original vira só metadado.
- Upload de arquivo excessivo (bucket rejeita via `file_size_limit`) → tratamento de erro do storage vira 400.
- Duplicidade de download: cada GET gera uma nova signed URL (não compartilha token).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REL-01 | P1: Página `/admin/relatorios` com seções Relatórios/Documentos | Design | Pending |
| REL-02 | P1: Export CSV financeiro com período e colunas | Design | Pending |
| REL-03 | P1: Totais (Receitas/Despesas/Saldo) no CSV financeiro | Design | Pending |
| REL-04 | P1: Export CSV de membros | Design | Pending |
| REL-05 | P1: Export CSV de eventos | Design | Pending |
| REL-06 | P1: Export CSV de patrimônio | Design | Pending |
| REL-07 | P1: Validação de `tipo` no export (400) | Design | Pending |
| REL-08 | P1: Formato CSV (`;`, BOM, escape RFC 4180) | Design | Pending |
| REL-09 | P2: Upload multipart + metadados | Design | Pending |
| REL-10 | P2: Guarda de escrita no upload (403 leitor) | Design | Pending |
| REL-11 | P2: Listagem por categoria (searchParams) | Design | Pending |
| REL-12 | P2: Validação upload por campo (400) | Design | Pending |
| REL-13 | P2: Rollback de objeto órfão | Design | Pending |
| REL-14 | P3: Download via signed URL (307) | Design | Pending |
| REL-15 | P3: 404 documento inexistente | Design | Pending |
| REL-16 | P3: Exclusão row + objeto (200) | Design | Pending |
| REL-17 | P3: Guarda de escrita no DELETE (403 leitor) | Design | Pending |
| REL-18 | P3: Auth 401 unauthenticated nas rotas | Design | Pending |
| REL-19 | P3: Upload form só escritores; download p/ leitores | Design | Pending |
| REL-20 | P4: Card Relatórios no dashboard | Design | Pending |
| REL-21 | P4: Denied-block página + proxy redirect | Design | Pending |
| REL-22 | P4: 403 export sem permissão | Design | Pending |
| REL-23 | P4: Enum fixo de categorias (CHECK DB) | Design | Pending |

**Coverage:** 23 total, 0 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] FINANCEIRO exports financial + management reports as CSV; readers also export financial reports
- [ ] FINANCEIRO uploads, lists by category, downloads and deletes documents; readers list and download only
- [ ] RLS and route guards enforce `relatorios` matrix; anon gets 401; non-matrix roles get 403
- [ ] Download works for readers via signed URL; delete is writer-only
- [ ] All gates pass: lint, typecheck, build, probe suite (static + runtime)