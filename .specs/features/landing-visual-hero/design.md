# Landing Visual — Sistema de Efeitos Unificado — Design

**Spec**: `.specs/features/landing-visual-hero/spec.md`
**Status**: Approved

---

## Architecture Overview

Um primitive único (`SectionShell`) mais um primitive de superfície
(`SurfaceCard`). O `SectionShell` encapsula **exatamente** a técnica do Hero —
camadas `absolute inset-0` empilhadas por ordem de DOM, sem `z-index` entre
eles, conteúdo elevado com `relative z-10` — e adiciona três variantes de
efeito. Nenhuma seção volta a declarar seu próprio fundo.

```
<SectionShell id="cultos" effect="feixe">
  <SectionHeader … />        ← padroniza "text-center mb-16"
  <SurfaceCard … />          ← vidro translúcido (efeito vitral)
</SectionShell>
```

### Abordagens avaliadas

| Abordagem | Prós | Contras | Veredito |
| --------- | ---- | ------ | -------- |
| **A — Primitive `SectionShell`** (escolhida) | Uma fonte de verdade; impossível divergir de novo; 9 seções em 9 chamadas | Introduz 1 componente novo no vocabulário | **Escolhida** — elimina a classe de bug (divergência) em vez de corrigir o caso atual |
| B — Variáveis CSS + classes utilitárias em `globals.css` (`@utility`) | Zero componente, tudo em CSS | Não compõe conteúdo+camadas; cada seção repetiria a pilha de divs | Rejeitada — não elimina a duplicação estrutural |
| C — Ediar cada seção individualmente com gradientes类似 | Nenhum componente novo | Preserva a duplicação; a 10ª seção divergiria de novo | Rejeitada — conserta o sintoma, não a causa |

**Efeito da técnica do Hero**: o Hero **não** passa a usar o `SectionShell`
(ficaria visualmente idêntico mas ganharia um wrapper desnecessário, e a spec
exige Hero intocado, VIS-05). Em vez disso o `SectionShell` **replica** a
estrutura dele e o probe garante que as duas pilhas de classes continuam
convergentes por comparação literal.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component / pattern | Location | How to Use |
| ------------------- | -------- | ---------- |
| Três camadas `absolute inset-0` do Hero | `Hero.tsx:14,16,18` | Geometria e ordem replicadas no primitive |
| Glow radial `#1a3a6b30 → transparent 70%` | `Hero.tsx:16` | Movido para token; `70%` preservado (VIS-09) |
| Wrapper `relative z-10` do conteúdo | `Hero.tsx:20` | Padrão de empilhamento do primitive |
| Container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | 9 arquivos | Extraído para `SectionShell`/`SectionInner` |
| Cabeçalho `text-center mb-16` + `whileInView` | `Leadership.tsx:27` e pares | Extraído para `SectionHeader` |
| Card `rounded-2xl … shadow-xl hover:-translate-y-2` | `Schedule.tsx:49` e pares | Base do `SurfaceCard` |
| `py-20 sm:py-32` | 5 seções | Mantido como espaçamento padrão do shell |
| Tokens `@theme inline` | `globals.css:6-33` | Origem única de cor; nenhum hex novo |
| Token `bg-admin-surface` | `globals.css:26` | Substitui `#132744` cru do PixDonation |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| `@theme` do Tailwind v4 | CSS-first; **não existe** `tailwind.config.*` — tokens só em `globals.css` |
| framer-motion `whileInView` | Mantido como está; nunca aplicado a camadas de fundo |
| `lucide-react` / `react-icons` | Ícones intocados |
| Rotas `/doacao`, `/eventos`, `/eventos/[id]` | Wrappers de página recebem o mesmo shell |
| `package.json` | **Nenhuma** dependência nova (VIS-15) |

---

## Components

### `SectionShell`

- **Purpose**: Wrapper único de seção — carrega a base do Hero, o glow único e a variante de efeito.
- **Location**: `src/components/visual/SectionShell.tsx`
- **Interfaces**:
  - `SectionShell({ id, effect, className, innerClassName, children }: { id: string; effect?: "aurora" | "feixe" | "vitral"; className?: string; innerClassName?: string; children: ReactNode })`
- **Estrutura interna** (espelha `Hero.tsx:10-20`):
  1. `<section id className="relative overflow-hidden">`
  2. camada base — `absolute inset-0 bg-gradient-to-br from-bg-dark via-primary/90 to-primary`
  3. camada de glow — `absolute inset-0` com o gradiente radial **derivado de token**
  4. camada de efeito — só em `feixe` e `vitral`
  5. `<div className="relative z-10">` com `py-20 sm:py-32` + container
- **Dependências**: nenhuma
- **Reuses**: a pilha de classes do Hero

### `SurfaceCard`

- **Purpose**: Cartão de conteúdo translúcido sobre o fundo escuro.
- **Location**: `src/components/visual/SurfaceCard.tsx`
- **Interfaces**: `SurfaceCard({ as, effect, className, children })` — `as` permite `article` (eventos) sem duplicar markup
- **Reuses**: `rounded-2xl`, `shadow-xl`, `hover:shadow-2xl`, `transition-all duration-500 hover:-translate-y-2` dos cards atuais

### `SectionHeader`

- **Purpose**: Título + subtítulo com o mesmo ritmo (`text-center mb-16`) e o mesmo `whileInView` existente.
- **Location**: `src/components/visual/SectionHeader.tsx`
- **Reuses**: `motion.div whileInView` de `Leadership.tsx:27`

### Tokens novos em `globals.css`

| Token | Valor | Uso |
| ----- | ----- | --- |
| `--color-hero-glow` | `rgb(26 58 107 / 0.19)` | Camada de glow do shell (substitui `#1a3a6b30`) |
| `--color-surface-deep` | `#0d1f3c` | Caixa do payload PIX (hoje hex cru) |
| `--color-glass` | `rgb(255 255 255 / 0.05)` | Fundo do `SurfaceCard` |
| `--color-glass-border` | `rgb(255 255 255 / 0.10)` | Borda do `SurfaceCard` |

`@utility` não é necessário: Tailwind v4 gera `bg-hero-glow`/`bg-glass` a partir
de `--color-*` no `@theme`, igual aos tokens existentes.

---

## Data Models

Nenhum. Nenhuma chamada de dados, prop ou estado novo — a feature é
apresentacional. `page.tsx` continua exatamente igual (mesmos `listarIgrejas()`,
`listarLideresAtivos()`, `obterConfiguracoes()` na mesma ordem e no mesmo
`try/catch`).

---

## Error Handling Strategy

Não aplicável no sentido usual: não há I/O novo. A degradação relevante é
visual e está especificada.

| Cenário | Tratamento | Impacto |
| ------- | ---------- | ------- |
| `backdrop-blur` indisponível | O card mantém `bg-glass` translúcido | Legível pelo contraste da borda |
| Camada decorativa sobrepondo conteúdo | `pointer-events-none` em toda camada + `relative z-10` no conteúdo | Nenhum clique perdido |
| `motion` indisponível / JS desligado | Conteúdo renderiza sem animação (estático) | Seções visíveis; sem camada de fundo animada |
| `prefers-reduced-motion` | Efeitos são CSS estático; nenhum loop | VIS-13 satisfeita por construção |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------- | ------ | ---------- |
| **Contraste** — texto secundário hoje em `text-text-dark/60` sobre branco | `About.tsx:25`, `Schedule.tsx:72`, `SocialLinks.tsx:64`, `Values` | Sobre marinho, `#1a1a2e/60` fica ilegível | Migrar secundário para `text-white/70` (mínimo, VIS-18) e títulos para `text-white`; probe estático afirma ausência de `text-text-dark` na landing |
| **`text-1xl` morto** | `Leadership.tsx:76` | Nome do líder renderiza no tamanho herdado | Corrigido para `text-xl` na migration das seções |
| Cor de marca dos ícones sociais | `SocialLinks.tsx:8-37` (hex de rede) | São cores de marca, **não** paleta institucional | Mantidas por decisão explícita: são identidade de terceiro, não tokens da igreja (constante nova `SOCIAL_BRANDS` separada da paleta) |
| `PixDonation` compartilhado com `/painel/dizimo` | `PixDonation.tsx:28` | Mudar o card para vidro pode afetar o painel do membro | O painel já é marinho escuro (`#0a1628`/`#132744`); a migração para token **não** altera a cor percebida. Probe verifica que nenhum hex cru sobra, não a cor |
| Nove seções × wrapper = diff grande | 9 componentes + 3 rotas | Risco de regressão visual silenciosa | Nenhum dado/roda/âncora tocado; `npm run build` + probe estático de不为-declarado + smoke HTTP de `/`, `/doacao`, `/eventos` |
| Camada de fundo pode cortar conteúdo alto | novo shell | Cards muito Numerous obscurecidos | Camadas são `inset-0` dentro de `relative` na seção → acompanham a altura real; content em `z-10` |
| Sem navegador headless no ambiente | restrição do ambiente | Não há verificação visual automatizada | Verificação por: build, typecheck, lint, probe estático das classes, e smoke HTTP das rotas. **Limitação declarada ao usuário** — a aprovação visual final é humana |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Efeito único do Hero | Wrapper próprio, não `SectionShell` | VIS-05 exige Hero intocado; evita wrapper sem ganho |
| Ordem das camadas | DOM order, sem `z-index` entre camadas | Replica a técnica do Hero exatamente (mesma manutenção, mesma performance) |
| Glow por token | `rgb(26 58 107 / 0.19)` = `0x30` exato | Preserva o alpha **real** do Hero (19%) sem hex cru |
| Três efeitos | `aurora` / `feixe` / `vitral` | Cobre radial, blur/shape e profundidade/transparência — os três grupos do pedido |
| Cards | `SurfaceCard` com `backdrop-blur-sm` | Profundidade com um `backdrop-filter`; `sm` limita custo |
| Sem `motion` em fundos | Camadas 100% CSS | VIS-14 — zero JS por frame |
| Cores de rede social | Mantidas literais | Identidade de terceiro, fora da paleta institucional |
| Navbar ao rolar | `bg-bg-dark/80 backdrop-blur-md` | Evita a faixa branca sobre seções marinho |

> **Decisão de nível de projeto a registrar como AD-021:** a Landing Page passa
> a ter **um primitive de seção** (`SectionShell`) como padrão obrigatório para
> qualquer seção nova; fundos não são declarados por seção, e o glow do Hero é
> definido uma única vez por token.
