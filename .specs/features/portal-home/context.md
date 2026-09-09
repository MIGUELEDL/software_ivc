# Portal Home Context

**Gathered:** 2026-09-08
**Spec:** `.specs/features/portal-home/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A rota `/` (one-page com âncoras) apresenta as seções institucionais completas da
árvore oficial: Sobre/História, Missão/Visão/Valores, Liderança (nova), Localização +
contato, Cultos e Redes sociais. Eventos e Doação ficam em rotas próprias (F2/F3);
Login é F4. Dados sempre vindos de `src/lib/constants.ts` (AD-008).

---

## Implementation Decisions

### Formato da Home

- **One-page com âncoras** (não rotas separadas no MVP) — árvore oficial lista as
  seções sob "Home"; navegação atual já usa âncoras (`#sobre`, `#cultos`…).
- Rotas separadas só para Eventos (F2) e Doação (F3), que têm comportamento próprio.

### Imagens (reestruturação — decidido pelo administrador)

- As imagens atuais (`public/img1..10.jpg`) estão **obsolatas** e serão **excluídas**.
- Mantém-se apenas **`public/logo.png`** (logo oficial da igreja).
- **Placeholders** estruturados agora; novas imagens serão fornecidas depois e trocam
  os placeholders sem reestruturar o layout.
- Hero e About: fundo/repórter usa **gradiente/placeholder** (sem depender de foto).
- **Gallery não faz parte da árvore oficial** e depende de imagens inexistentes →
  seção **removida** da home (reentra quando as novas imagens chegarem, como feature
  própria — anotado em Deferred Ideas).

### Liderança

- Nova seção `#lideranca` exibindo `CHURCH.leader` (Pastor Ernandes Nogueira de Lucena),
  dados do `constants.ts`. Listagem múltipla de líderes fica para RF-023 (painel admin).

### Missão / Visão / Valores

- Seção "Nossos Valores" passa a exibir **Missão** (`CHURCH.mission`) e **Visão**
  (`CHURCH.vision`) acima dos cards de Valores (`CHURCH.values`).

### Acessibilidade & responsividade

- Imagens com `alt` descritivo; links com `aria-label` quando ícone-only (RNF-012).
- Layout mobile-first (RNF-001), padrão atual dos componentes (âmogs flex/grid).

---

## Agent's Discretion

- Estilo visual dos placeholders (gradientes que combinem com a paleta atual:
  `bg-bg-dark`, `bg-primary`, `bg-accent`), contanto que não dependa de fotos.

---

## Declined / Undiscussed Gray Areas → Assumptions

Nenhum em aberto — as decisões acima estão confirmadas pelo administrador (2026-09-08).

---

## Specific References

- "não use essas imgs, vamos reestruturar novas imagens, essas estão ultrapassadas"
- "deixe apenas a public/logo.png que é a logo da igreja"
- "placeholders agora, imagens depois"

---

## Deferred Ideas

- **Galeria de momentos** (`public/img1..10` antigas): remove da home; reabrir como
  feature própria quando as novas imagens forem fornecidas.
- Liderança ampliada (lista) → RF-023 no painel admin (onda 3).