# Simulador Brasileirão Série A 2027

Aplicação web estática (SPA) inspirada no layout do *ge.globo* para simulação completa do Campeonato Brasileiro Série A 2027, desenvolvida em HTML5, CSS3 e JavaScript Vanilla (ES6+) com persistência automática em `localStorage`.

## Funcionalidades

- **Tabela & Jogos (38 Rodadas):**
  - Calendário completo de turno e returno (380 partidas únicas) gerado por algoritmo Round-Robin.
  - Recálculo instantâneo da classificação seguindo rigorosamente os critérios oficiais da CBF: Pontos (`P`), Vitórias (`V`), Saldo de Gols (`SG`), Gols Pró (`GP`), Confronto Direto (para empates entre exatamente 2 clubes), Cartões Vermelhos, Cartões Amarelos e ID do clube.
  - **9 Visões de Tabela:** Classificação Geral, 1º Turno, 2º Turno, Mandante, Visitante, Melhor Ataque, Melhor Defesa (`GC`), Melhor Saldo e Maior Pontuador da Equipe (`MVP`).
  - **Modo Spoiler:** oculta a classificação com desfoque (`blur`) para simular rodadas sem revelar a tabela.
  - **Simulação Rápida:** botões para simular apenas a rodada atual ou todo o campeonato restante, ponderados pelo `pesoGol` dos elencos e mando de campo.
- **Motor de Eventos & Súmula ("Ver mais"):**
  - Geração silenciosa de autores dos gols, assistências (75% de chance, sem autoassistência), cartões amarelos/vermelhos e notas (`0.0` a `10.0`) para os 22 titulares.
  - Edição manual de autores de gols e assistências via modal, com recálculo automático de notas, rankings e classificação.
- **Plantéis (20 Clubes / 220 Jogadores):**
  - Seleção rápida por escudo e visualização dos 11 titulares por posição (`GOL`, `DEF`, `MEI`, `ATA`), pesos (`pesoGol`, `pesoAssistencia`, `pesoCartao`) e estatísticas acumuladas.
- **Rankings & Resumo da Temporada:**
  - Rankings de Artilharia, Garçons, Mais Cartões e Craque do Campeonato.
  - Dashboard interativo com barra de progresso (`X / 380`), Campeão/Líder, G6 (G4 + Pré-Libertadores), Z4 e líderes individuais.
- **Tema Claro & Dark Mode:** alternância no cabeçalho com persistência no `localStorage`.

## Estrutura do Projeto

- `index.html` — Estrutura da SPA e modal da súmula
- `style.css` — Tema claro/escuro via variáveis CSS e layout responsivo
- `app.js` — Lógica de calendário, classificação CBF, simulação, súmula e rankings
- `dados.json` — Base de dados completa com os 20 clubes e 220 jogadores titulares

## Como Executar Localmente

Por utilizar `fetch('./dados.json')`, abra o projeto através de um servidor HTTP local (ex.: extensão **Live Server** no VS Code, `npx serve .` ou `python -m http.server`).

## Deploy

Aplicação 100% estática, sem etapa de build, pronta para publicação direta no **GitHub Pages** ou **Vercel**.
