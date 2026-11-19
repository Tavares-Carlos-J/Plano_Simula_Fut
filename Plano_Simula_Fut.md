# PLANO DE EXECUÇÃO: Simulador Brasileirão Série A 2027

## DIRETRIZES GERAIS
- **Arquitetura:** Aplicação web estática (SPA) sem etapas de build, pronta para deploy direto no **GitHub Pages** ou **Vercel**.
- **Arquivos:** `index.html`, `style.css`, `dados.json` (carregado via caminho relativo `./dados.json`) e `app.js` (Vanilla JS ES6+ com persistência em `localStorage`).
- **Identidade Visual:** Layout limpo e minimalista inspirado no *ge.globo*, com alternância entre Tema Claro e Dark Mode.
- **Regra de Ouro:** Execute **estritamente uma etapa por vez**. Pare ao final de cada etapa e aguarde validação antes de iniciar a próxima.

---

## ETAPA 1: Esqueleto da Aplicação, Layout Base e Dark Mode
1. **Arquivos Iniciais:** Crie `index.html`, `style.css` e um `app.js` inicial para controle de navegação e tema.
2. **Sistema de Temas (Claro / Dark Mode):**
   - Configure variáveis CSS (`--bg-primary`, `--bg-card`, `--text-primary`, `--border-color`, etc.) para alternar entre **Modo Claro (padrão ge.globo)** e **Modo Escuro** por um botão no cabeçalho, salvando a escolha no `localStorage`.
3. **Navegação e Grid Principal (`Tabela & Jogos`):**
   - Crie uma barra superior com 4 abas (`Tabela & Jogos`, `Plantéis`, `Rankings`, `Resumo da Temporada`) e um botão global **"Resetar Campeonato"**.
   - Na aba `Tabela & Jogos`, monte o grid responsivo de 2 colunas (Desktop):
     - **Esquerda (65%) — Classificação:** Estrutura da tabela com colunas `Posição`, `Time`, **P**, **J**, **V**, **SG**, **GP**. Legenda de zonas no rodapé: 1º–4º Azul Escuro (Libertadores), 5º–6º Azul Claro (Pré-Libertadores), 7º–12º Verde (Sul-Americana), 13º–16º Cinza, 17º–20º Vermelho (Rebaixados).
     - **Modo Spoiler / Esconder Tabela:** Botão toggle acima da tabela que aplica `filter: blur(8px)` na classificação para simular rodadas no escuro.
     - **Direita (35%) — Painel de Jogos:** Cabeçalho `< 1ª RODADA >` e área de listagem dos confrontos.

---

## ETAPA 2: Base de Dados Completa (`dados.json`)
1. **Regra Anti-Truncamento:** Dedique esta etapa exclusivamente à criação do arquivo `dados.json` válido. Escreva **todos os 20 clubes e todos os 220 jogadores** na íntegra — é proibido usar comentários ou abreviações como `// repetir para os demais times`.
2. **Estrutura de Cada Clube:**
   - Campos: `id` (1 a 20), `nome`, `sigla` (3 letras), `escudo` (SVG inline otimizado ou URL estável da Wikimedia Commons) e `elenco` (array com **11 titulares reais e atuais**: 1 GOL, 4 DEF, 3 MEI, 3 ATA).
   - **Lista Oficial dos 20 Clubes:**
     1. Flamengo (`FLA`), 2. Palmeiras (`PAL`), 3. Fluminense (`FLU`), 4. Cruzeiro (`CRU`), 5. Bahia (`BAH`), 6. Athletico-PR (`CAP`), 7. Santos (`SAN`), 8. Red Bull Bragantino (`RBB`), 9. Atlético-MG (`CAM`), 10. Vasco (`VAS`), 11. São Paulo (`SAO`), 12. Corinthians (`COR`), 13. Vitória (`VIT`), 14. Coritiba (`CFC`), 15. Botafogo (`BOT`), 16. Mirassol (`MIR`), 17. Novorizontino (`NOV`), 18. Juventude (`JUV`), 19. Atlético-GO (`ACG`), 20. Fortaleza (`FOR`).
3. **Atributos e Pesos dos Jogadores:**
   - Cada jogador deve conter `id`, `nome`, `posicao` (`GOL`, `DEF`, `MEI`, `ATA`) e pesos inteiros de `1` a `100`:
     - `pesoGol` (Goleiros: `0` ou `1`; Zagueiros: `5`–`15`; Meias: `20`–`55`; Atacantes: `50`–`95`).
     - `pesoAssistencia` (Meias armadores e pontas com valores mais altos).
     - `pesoCartao` (Zagueiros e volantes com valores mais altos).

---

## ETAPA 3: Aba "Plantéis" (Visualização de Elencos e Pesos)
1. **Conexão com `dados.json`:** Carregue `./dados.json` no `app.js` via `fetch()` usando caminho relativo.
2. **Interface da Aba `Plantéis`:**
   - Crie uma barra horizontal/grid de seleção rápida com os escudos e siglas dos 20 clubes.
   - Ao clicar em um clube, renderize o painel do plantel exibindo: nome e escudo do clube, força média do elenco e a lista/cards dos **11 jogadores titulares** organizados por posição (`GOL` -> `DEF` -> `MEI` -> `ATA`).
   - Exiba para cada atleta: nome, posição, barras ou badges visuais dos seus pesos (`pesoGol`, `pesoAssistencia`, `pesoCartao`) e suas estatísticas acumuladas na simulação (Jogos, Gols, Assistências, Cartões Amarelos/Vermelhos e Nota Média — iniciando zeradas).

---

## ETAPA 4: Calendário Round-Robin, Tabela Principal e Critérios CBF
1. **Gerador de Tabela (38 Rodadas):**
   - Implemente algoritmo Round-Robin de turno e returno gerando **38 rodadas** (10 jogos por rodada, 380 jogos únicos no total) e salve a estrutura no `localStorage`.
   - Renderize os cards de partida na coluna direita com `[SIGLA] [ESCUDO] [INPUT PLACAR] x [INPUT PLACAR] [ESCUDO] [SIGLA]` e o botão discreto **"Ver mais"** abaixo de cada jogo.
2. **Motor de Classificação e Critérios Oficiais da CBF:**
   - A cada placar digitado, recalcule e reordene a tabela instantaneamente obedecendo rigorosamente:
     1. Maior número de **Pontos (P)** (`V=3`, `E=1`, `D=0`)
     2. Maior número de **Vitórias (V)**
     3. Maior **Saldo de Gols (SG)**
     4. Maior número de **Gols Pró (GP)**
     5. **Confronto Direto** (aplicado quando o empate envolver exatamente 2 clubes)
     6. Menor número de **Cartões Vermelhos** recebidos
     7. Menor número de **Cartões Amarelos** recebidos
     8. ID fixo do clube no JSON (fallback determinístico)

---

## ETAPA 5: Tabelas Alternativas e Botões de Aleatoriedade
1. **Seletor de Tabelas Alternativas:**
   - Adicione um menu seletor acima da classificação para alternar dinamicamente entre 9 visões:
     - `Classificação Geral` (Padrão)
     - `1º Turno` (Rodadas 1 a 19)
     - `2º Turno` (Rodadas 20 a 38)
     - `Mandante` (Apenas jogos em casa)
     - `Visitante` (Apenas jogos fora)
     - `Melhor Ataque` (Ordenado por GP)
     - `Melhor Defesa` (Ordenado por menor GC, exibindo a coluna Gols Contra nesta visão)
     - `Melhor Saldo` (Ordenado por SG)
     - `Maior Pontuador da Equipe (MVP)` (Lista cada clube ao lado do seu jogador com maior média de nota/participações em gols).
2. **Botões de Aleatoriedade (Simulação Rápida):**
   - Adicione os botões **"Simular Rodada"** (preenche apenas partidas vazias da rodada atual) e **"Simular Campeonato Restante"** (preenche todos os jogos vazios das 38 rodadas).
   - Calcule os placares aleatórios ponderados pela soma de `pesoGol` dos elencos envolvidos + leve vantagem para o time mandante.

---

## ETAPA 6: Motor Silencioso de Eventos, Súmula ("Ver mais") e Edição Manual
1. **Simulação Silenciosa em Background:**
   - Assim que ambos os placares de um jogo forem preenchidos (manualmente ou via aleatoriedade), execute em segundo plano a geração de eventos da partida para atualizar os Rankings, os Plantéis e os critérios de cartões da CBF — sem abrir modais automaticamente.
   - **Consistência Matemática Rígida:** Se o placar for `2 x 1`, sorteie **exatamente 2 autores de gols** para o mandante e **exatamente 1** para o visitante via sorteio ponderado (`pesoGol`). Nunca gere mais ou menos gols do que o placar informado.
   - **Assistências:** Para cada gol, 75% de chance de gerar uma assistência sorteada via `pesoAssistencia` entre os outros 10 titulares do mesmo time (proibida autoassistência).
   - **Cartões:** Sorteie de 0 a 5 amarelos e 10% de chance de vermelho na partida distribuídos entre os 22 atletas via `pesoCartao`.
   - **Notas (0.0 a 10.0):** Nota base `6.0` + modificadores: vitória (`+0.5`), derrota (`-0.4`), gol (`+1.2`), assistência (`+0.8`), goleiro/defensor sem sofrer gol (`+0.7`), amarelo (`-0.3`), vermelho (`-1.5`) + variação aleatória (`-0.3` a `+0.3`).
2. **Modal "Ver mais" e Edição Manual:**
   - Clicar em **"Ver mais"** em uma partida preenchida abre um Modal com: placar, autores dos gols (com minuto fictício entre 1' e 90'+), assistências, cartões e as notas dos 11 titulares de cada lado.
   - Permita trocar manualmente quem fez cada gol e quem deu a assistência usando menus `<select>` com os 11 jogadores do time. Ao salvar, atualize o `localStorage`, recalcule as notas da partida e atualize os Rankings.

---

## ETAPA 7: Aba "Rankings" e "Resumo da Temporada"
1. **Aba `Rankings`:**
   - Renderize listas classificatórias atualizadas em tempo real para: **Artilharia (Gols)**, **Garçons (Assistências)**, **Mais Cartões** e **Craque do Campeonato (Melhores Notas)**.
2. **Aba `Resumo da Temporada` (Dashboard Interativo):**
   - Exiba uma barra de progresso de jogos simulados (`X / 380 jogos`) e cards visuais interativos destacando:
     - **Campeão:** Escudo, pontuação total, aproveitamento (%) e artilheiro da equipe.
     - **Classificados ao G6:** Separação visual entre G4 (Libertadores) e G5–G6 (Pré-Libertadores) com escudos e pontos.
     - **Z4 (Rebaixados):** Os 4 últimos colocados destacados em vermelho com escudos e pontos.
     - **Rei da Artilharia & Rei das Assistências:** Cards comparativos com escudo do clube, totais e média por partida.

---

## ETAPA 8: Revisão (QA), GitHub e Deploy
1. **Auditoria Final:**
   - Valide a sintaxe do `dados.json` (20 clubes e 220 jogadores), confirme que todas as rotas usam caminhos relativos (`./`) e substitua por SVG inline qualquer escudo cuja imagem falhe.
   - Teste cenários críticos: consistência de gols em placares variados (`0x0`, `1x0`, `4x2`), desempate por Confronto Direto e Cartões, edição manual de gols persistindo após `F5`, Modo Spoiler, 9 Tabelas Alternativas, Dark Mode e responsividade mobile (`375px`) com zero erros no console.
2. **Versionamento e Publicação:**
   - Crie `.gitignore` (`.DS_Store`, `Thumbs.db`, `.vscode/`) e um `README.md` limpo documentando o projeto.
   - Inicialize o Git (se necessário), faça o commit e envie (`git push`) para a branch `main` no GitHub para ativação direta via **GitHub Pages** ou **Vercel**.