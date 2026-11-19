(() => {
  'use strict';

  const STORAGE_KEYS = {
    THEME: 'simula_fut_theme',
    ACTIVE_TAB: 'simula_fut_active_tab',
    SPOILER: 'simula_fut_spoiler',
    MATCHES: 'simula_fut_matches',
    CURRENT_ROUND: 'simula_fut_current_round',
  };

  const TOTAL_ROUNDS = 38;
  const POSITION_ORDER = ['GOL', 'DEF', 'MEI', 'ATA'];
  const POSITION_LABELS = {
    GOL: 'Goleiro',
    DEF: 'Defensores',
    MEI: 'Meio-Campistas',
    ATA: 'Atacantes',
  };

  let currentRound = 1;
  let standingsView = 'geral';
  let clubs = [];
  let clubsById = {};
  let playersById = {};
  let matches = [];
  let playerStatsCache = {};
  let selectedClubId = null;
  let activeModalMatchId = null;

  const elements = {
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnSpoilerToggle: document.getElementById('btn-spoiler-toggle'),
    standingsViewSelect: document.getElementById('standings-view-select'),
    standingsThead: document.getElementById('standings-thead'),
    standingsWrapper: document.getElementById('standings-table-wrapper'),
    standingsTbody: document.getElementById('standings-tbody'),
    matchesList: document.getElementById('matches-list'),
    btnSimRound: document.getElementById('btn-sim-round'),
    btnSimRemaining: document.getElementById('btn-sim-remaining'),
    btnResetChampionship: document.getElementById('btn-reset-championship'),
    btnPrevRound: document.getElementById('btn-prev-round'),
    btnNextRound: document.getElementById('btn-next-round'),
    currentRoundLabel: document.getElementById('current-round-label'),
    squadClubSelector: document.getElementById('squad-club-selector'),
    squadDetailPanel: document.getElementById('squad-detail-panel'),
    rankingsContainer: document.getElementById('rankings-container'),
    summaryContainer: document.getElementById('summary-container'),
    matchModal: document.getElementById('match-modal'),
    matchModalTitle: document.getElementById('match-modal-title'),
    matchModalSubtitle: document.getElementById('match-modal-subtitle'),
    matchModalBody: document.getElementById('match-modal-body'),
    matchModalFooter: document.getElementById('match-modal-footer'),
    btnCloseModal: document.getElementById('btn-close-modal'),
  };

  /* ========================
     Sistema de Temas
     ======================== */
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const icon = elements.btnThemeToggle.querySelector('.theme-icon');
    const label = elements.btnThemeToggle.querySelector('.theme-label');

    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';

    elements.btnThemeToggle.setAttribute(
      'aria-label',
      isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'
    );
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    applyTheme(savedTheme);

    elements.btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      applyTheme(next);
    });
  }

  /* ========================
     Navegação por Abas
     ======================== */
  function activateTab(tabId) {
    elements.navTabs.forEach((tab) => {
      const isMatch = tab.dataset.tab === tabId;
      tab.classList.toggle('is-active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    });

    elements.tabPanels.forEach((panel) => {
      const isMatch = panel.id === `tab-${tabId}`;
      panel.classList.toggle('is-active', isMatch);
      panel.hidden = !isMatch;
    });

    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tabId);
  }

  function initTabs() {
    const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || 'tabela-jogos';
    const hasSavedTab = Array.from(elements.navTabs).some(
      (tab) => tab.dataset.tab === savedTab
    );
    activateTab(hasSavedTab ? savedTab : 'tabela-jogos');

    elements.navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activateTab(tab.dataset.tab);
      });
    });
  }

  /* ========================
     Modo Spoiler
     ======================== */
  function applySpoilerState(isHidden) {
    elements.standingsWrapper.classList.toggle('is-spoiler-blurred', isHidden);
    elements.btnSpoilerToggle.setAttribute('aria-pressed', String(isHidden));

    const label = elements.btnSpoilerToggle.querySelector('.spoiler-label');
    if (label) {
      label.textContent = isHidden ? 'Mostrar Tabela' : 'Esconder Tabela';
    }
  }

  function initSpoilerMode() {
    const savedSpoiler = localStorage.getItem(STORAGE_KEYS.SPOILER) === 'true';
    applySpoilerState(savedSpoiler);

    elements.btnSpoilerToggle.addEventListener('click', () => {
      const next = !elements.standingsWrapper.classList.contains('is-spoiler-blurred');
      localStorage.setItem(STORAGE_KEYS.SPOILER, String(next));
      applySpoilerState(next);
    });
  }

  /* ========================
     Navegador de Rodada
     ======================== */
  function updateRoundUI() {
    elements.currentRoundLabel.textContent = `${currentRound}ª RODADA`;
    elements.btnPrevRound.disabled = currentRound <= 1;
    elements.btnNextRound.disabled = currentRound >= TOTAL_ROUNDS;
  }

  function initRoundNavigator() {
    const savedRound = Number(localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND));
    if (savedRound >= 1 && savedRound <= TOTAL_ROUNDS) {
      currentRound = savedRound;
    }
    updateRoundUI();

    elements.btnPrevRound.addEventListener('click', () => {
      if (currentRound > 1) {
        currentRound -= 1;
        localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, String(currentRound));
        updateRoundUI();
        renderMatches();
      }
    });

    elements.btnNextRound.addEventListener('click', () => {
      if (currentRound < TOTAL_ROUNDS) {
        currentRound += 1;
        localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, String(currentRound));
        updateRoundUI();
        renderMatches();
      }
    });
  }

  /* ========================
     Aba Plantéis & Dados
     ======================== */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function computeSquadStrength(club) {
    if (!club || !Array.isArray(club.elenco) || club.elenco.length === 0) {
      return 0;
    }
    const total = club.elenco.reduce((sum, player) => {
      return sum + player.pesoGol + player.pesoAssistencia;
    }, 0);
    return Math.round(total / club.elenco.length);
  }

  function getPlayerStats(playerId) {
    return (
      playerStatsCache[playerId] || {
        jogos: 0,
        gols: 0,
        assistencias: 0,
        amarelos: 0,
        vermelhos: 0,
        somaNotas: 0,
        notaMedia: '0.0',
      }
    );
  }

  function refreshPlayerStatsCache() {
    const stats = {};
    clubs.forEach((club) => {
      club.elenco.forEach((p) => {
        stats[p.id] = {
          jogos: 0,
          gols: 0,
          assistencias: 0,
          amarelos: 0,
          vermelhos: 0,
          somaNotas: 0,
          notaMedia: '0.0',
        };
      });
    });

    matches.forEach((m) => {
      if (!isMatchCompleted(m) || !m.events) return;
      const homeClub = clubsById[m.homeId];
      const awayClub = clubsById[m.awayId];
      if (!homeClub || !awayClub) return;

      [...homeClub.elenco, ...awayClub.elenco].forEach((p) => {
        const entry = stats[p.id];
        if (!entry) return;
        entry.jogos += 1;
        const rating = m.events.ratings && typeof m.events.ratings[p.id] === 'number'
          ? m.events.ratings[p.id]
          : 6.0;
        entry.somaNotas += rating;
      });

      if (Array.isArray(m.events.goals)) {
        m.events.goals.forEach((g) => {
          if (stats[g.scorerId]) stats[g.scorerId].gols += 1;
          if (g.assistId && stats[g.assistId]) stats[g.assistId].assistencias += 1;
        });
      }

      if (Array.isArray(m.events.cards)) {
        m.events.cards.forEach((c) => {
          if (!stats[c.playerId]) return;
          if (c.type === 'yellow') stats[c.playerId].amarelos += 1;
          else if (c.type === 'red') stats[c.playerId].vermelhos += 1;
        });
      }
    });

    Object.values(stats).forEach((entry) => {
      entry.notaMedia =
        entry.jogos > 0 ? (entry.somaNotas / entry.jogos).toFixed(1) : '0.0';
    });

    playerStatsCache = stats;
  }

  function renderClubSelector() {
    if (!elements.squadClubSelector) return;

    if (clubs.length === 0) {
      elements.squadClubSelector.innerHTML = `
        <div class="empty-state empty-state-compact">
          <p class="empty-desc">Nenhum clube disponível.</p>
        </div>
      `;
      return;
    }

    elements.squadClubSelector.innerHTML = clubs
      .map((club) => {
        const isActive = club.id === selectedClubId;
        return `
          <button
            type="button"
            class="club-pill ${isActive ? 'is-active' : ''}"
            data-club-id="${club.id}"
            role="tab"
            aria-selected="${isActive}"
            title="${escapeHtml(club.nome)}"
          >
            <span class="club-pill-shield" aria-hidden="true">${club.escudo}</span>
            <span class="club-pill-sigla">${escapeHtml(club.sigla)}</span>
          </button>
        `;
      })
      .join('');

    elements.squadClubSelector.querySelectorAll('.club-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedClubId = Number(btn.dataset.clubId);
        renderClubSelector();
        renderSquadDetail();
      });
    });
  }

  function renderPlayerCard(player) {
    const stats = getPlayerStats(player.id);
    return `
      <article class="player-card">
        <div class="player-card-top">
          <h4 class="player-name">${escapeHtml(player.nome)}</h4>
          <span class="pos-badge pos-${player.posicao}">${player.posicao}</span>
        </div>

        <div class="player-weights">
          <div class="weight-row">
            <span class="weight-label">Gol</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill weight-bar-gol" style="width: ${player.pesoGol}%"></div>
            </div>
            <span class="weight-value">${player.pesoGol}</span>
          </div>
          <div class="weight-row">
            <span class="weight-label">Assistência</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill weight-bar-assist" style="width: ${player.pesoAssistencia}%"></div>
            </div>
            <span class="weight-value">${player.pesoAssistencia}</span>
          </div>
          <div class="weight-row">
            <span class="weight-label">Cartão</span>
            <div class="weight-bar-track">
              <div class="weight-bar-fill weight-bar-card" style="width: ${player.pesoCartao}%"></div>
            </div>
            <span class="weight-value">${player.pesoCartao}</span>
          </div>
        </div>

        <div class="player-stats-row" aria-label="Estatísticas acumuladas">
          <div class="stat-cell">
            <span class="stat-label" title="Jogos">J</span>
            <span class="stat-value">${stats.jogos}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label" title="Gols">G</span>
            <span class="stat-value">${stats.gols}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label" title="Assistências">A</span>
            <span class="stat-value">${stats.assistencias}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label" title="Cartões Amarelos">CA</span>
            <span class="stat-value">${stats.amarelos}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label" title="Cartões Vermelhos">CV</span>
            <span class="stat-value">${stats.vermelhos}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label" title="Nota Média">Nota</span>
            <span class="stat-value">${stats.notaMedia}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderSquadDetail() {
    if (!elements.squadDetailPanel) return;

    const club = clubs.find((item) => item.id === selectedClubId);
    if (!club) {
      elements.squadDetailPanel.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">Selecione um clube</p>
          <p class="empty-desc">Clique em qualquer escudo acima para ver os 11 titulares e seus pesos.</p>
        </div>
      `;
      return;
    }

    const strength = computeSquadStrength(club);
    const groupsHtml = POSITION_ORDER.map((pos) => {
      const players = club.elenco.filter((p) => p.posicao === pos);
      if (players.length === 0) return '';
      return `
        <section class="position-group">
          <h3 class="position-group-title">
            <span class="pos-badge pos-${pos}">${pos}</span>
            <span>${POSITION_LABELS[pos]} (${players.length})</span>
          </h3>
          <div class="players-grid">
            ${players.map(renderPlayerCard).join('')}
          </div>
        </section>
      `;
    }).join('');

    elements.squadDetailPanel.innerHTML = `
      <div class="squad-club-banner">
        <div class="squad-club-identity">
          <div class="squad-club-shield" aria-hidden="true">${club.escudo}</div>
          <div>
            <h2 class="squad-club-name">${escapeHtml(club.nome)}</h2>
            <span class="squad-club-meta">${escapeHtml(club.sigla)} • ${club.elenco.length} titulares</span>
          </div>
        </div>

        <div class="squad-strength-box">
          <span class="squad-strength-label">Força Média</span>
          <span class="squad-strength-value">${strength}</span>
        </div>
      </div>

      <div class="squad-groups">
        ${groupsHtml}
      </div>
    `;
  }

  /* ========================
     Calendário Round-Robin & Classificação CBF
     ======================== */
  function generateRoundRobinSchedule(clubList) {
    const ids = clubList.map((c) => c.id);
    const n = ids.length;
    const half = n / 2;
    const firstTurnRounds = [];
    const rotation = ids.slice(1);

    for (let roundIdx = 0; roundIdx < n - 1; roundIdx++) {
      const roundNumber = roundIdx + 1;
      const roundMatches = [];
      const currentOrder = [ids[0], ...rotation];

      for (let i = 0; i < half; i++) {
        const teamA = currentOrder[i];
        const teamB = currentOrder[n - 1 - i];

        const swapHome = i === 0 ? roundIdx % 2 === 1 : (roundIdx + i) % 2 === 1;
        roundMatches.push({
          round: roundNumber,
          homeId: swapHome ? teamB : teamA,
          awayId: swapHome ? teamA : teamB,
        });
      }

      firstTurnRounds.push(roundMatches);
      rotation.unshift(rotation.pop());
    }

    const allMatches = [];
    let matchId = 1;

    // 1º Turno (Rodadas 1 a 19)
    firstTurnRounds.forEach((roundMatches) => {
      roundMatches.forEach((pair) => {
        allMatches.push({
          id: matchId++,
          round: pair.round,
          homeId: pair.homeId,
          awayId: pair.awayId,
          homeGoals: null,
          awayGoals: null,
          events: null,
        });
      });
    });

    // 2º Turno (Rodadas 20 a 38 - mando invertido)
    firstTurnRounds.forEach((roundMatches) => {
      roundMatches.forEach((pair) => {
        allMatches.push({
          id: matchId++,
          round: pair.round + (n - 1),
          homeId: pair.awayId,
          awayId: pair.homeId,
          homeGoals: null,
          awayGoals: null,
          events: null,
        });
      });
    });

    return allMatches;
  }

  function saveMatches() {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  }

  function loadOrCreateMatches() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCHES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 380) {
          matches = parsed;
          return;
        }
      }
    } catch (error) {
      console.warn('Falha ao ler partidas salvas; gerando novo calendário.', error);
    }

    matches = generateRoundRobinSchedule(clubs);
    saveMatches();
  }

  function isMatchCompleted(match) {
    return (
      Number.isInteger(match.homeGoals) &&
      match.homeGoals >= 0 &&
      Number.isInteger(match.awayGoals) &&
      match.awayGoals >= 0
    );
  }

  function compareHeadToHead(clubAId, clubBId, completedMatches) {
    let ptsA = 0;
    let ptsB = 0;
    let gfA = 0;
    let gfB = 0;

    completedMatches.forEach((m) => {
      const isDirect =
        (m.homeId === clubAId && m.awayId === clubBId) ||
        (m.homeId === clubBId && m.awayId === clubAId);
      if (!isDirect) return;

      const goalsA = m.homeId === clubAId ? m.homeGoals : m.awayGoals;
      const goalsB = m.homeId === clubBId ? m.homeGoals : m.awayGoals;

      gfA += goalsA;
      gfB += goalsB;

      if (goalsA > goalsB) ptsA += 3;
      else if (goalsB > goalsA) ptsB += 3;
      else {
        ptsA += 1;
        ptsB += 1;
      }
    });

    if (ptsB !== ptsA) return ptsB - ptsA;
    const sgA = gfA - gfB;
    const sgB = gfB - gfA;
    if (sgB !== sgA) return sgB - sgA;
    if (gfB !== gfA) return gfB - gfA;
    return 0;
  }

  function filterMatchesByView(matchList, viewMode) {
    const completed = matchList.filter(isMatchCompleted);
    if (viewMode === 'turno1') {
      return completed.filter((m) => m.round >= 1 && m.round <= 19);
    }
    if (viewMode === 'turno2') {
      return completed.filter((m) => m.round >= 20 && m.round <= 38);
    }
    return completed;
  }

  function computeStandings(matchList, viewMode = 'geral') {
    const tableMap = {};
    clubs.forEach((club) => {
      tableMap[club.id] = {
        club,
        P: 0,
        J: 0,
        V: 0,
        E: 0,
        D: 0,
        GP: 0,
        GC: 0,
        SG: 0,
        redCards: 0,
        yellowCards: 0,
      };
    });

    const completedMatches = filterMatchesByView(matchList, viewMode);
    const countHome = viewMode !== 'visitante';
    const countAway = viewMode !== 'mandante';

    completedMatches.forEach((m) => {
      const home = tableMap[m.homeId];
      const away = tableMap[m.awayId];
      if (!home || !away) return;

      if (countHome) {
        home.J += 1;
        home.GP += m.homeGoals;
        home.GC += m.awayGoals;
        if (m.homeGoals > m.awayGoals) {
          home.V += 1;
          home.P += 3;
        } else if (m.homeGoals === m.awayGoals) {
          home.E += 1;
          home.P += 1;
        } else {
          home.D += 1;
        }
      }

      if (countAway) {
        away.J += 1;
        away.GP += m.awayGoals;
        away.GC += m.homeGoals;
        if (m.awayGoals > m.homeGoals) {
          away.V += 1;
          away.P += 3;
        } else if (m.awayGoals === m.homeGoals) {
          away.E += 1;
          away.P += 1;
        } else {
          away.D += 1;
        }
      }

      if (m.events && Array.isArray(m.events.cards)) {
        m.events.cards.forEach((card) => {
          const target = tableMap[card.clubId];
          if (!target) return;
          if (card.clubId === m.homeId && !countHome) return;
          if (card.clubId === m.awayId && !countAway) return;
          if (card.type === 'red') target.redCards += 1;
          else if (card.type === 'yellow') target.yellowCards += 1;
        });
      }
    });

    const rows = Object.values(tableMap).map((row) => ({
      ...row,
      SG: row.GP - row.GC,
    }));

    if (viewMode === 'ataque') {
      return rows.sort(
        (a, b) =>
          b.GP - a.GP ||
          b.P - a.P ||
          b.SG - a.SG ||
          a.club.id - b.club.id
      );
    }

    if (viewMode === 'defesa') {
      return rows.sort(
        (a, b) =>
          a.GC - b.GC ||
          b.P - a.P ||
          b.SG - a.SG ||
          a.club.id - b.club.id
      );
    }

    if (viewMode === 'saldo') {
      return rows.sort(
        (a, b) =>
          b.SG - a.SG ||
          b.P - a.P ||
          b.GP - a.GP ||
          a.club.id - b.club.id
      );
    }

    // Passo 1: Ordenar pelos 4 primeiros critérios (P, V, SG, GP)
    rows.sort((a, b) => {
      if (b.P !== a.P) return b.P - a.P;
      if (b.V !== a.V) return b.V - a.V;
      if (b.SG !== a.SG) return b.SG - a.SG;
      if (b.GP !== a.GP) return b.GP - a.GP;
      return a.club.id - b.club.id;
    });

    // Passo 2: Resolver empates aplicando Confronto Direto apenas quando houver exatamente 2 clubes empatados
    const resolved = [];
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      while (
        j < rows.length &&
        rows[j].P === rows[i].P &&
        rows[j].V === rows[i].V &&
        rows[j].SG === rows[i].SG &&
        rows[j].GP === rows[i].GP
      ) {
        j++;
      }

      const tiedGroup = rows.slice(i, j);
      if (tiedGroup.length > 1) {
        tiedGroup.sort((a, b) => {
          if (tiedGroup.length === 2) {
            const h2h = compareHeadToHead(a.club.id, b.club.id, completedMatches);
            if (h2h !== 0) return h2h;
          }
          if (a.redCards !== b.redCards) return a.redCards - b.redCards;
          if (a.yellowCards !== b.yellowCards) return a.yellowCards - b.yellowCards;
          return a.club.id - b.club.id;
        });
      }

      resolved.push(...tiedGroup);
      i = j;
    }

    return resolved;
  }

  function computeClubMvpRows() {
    const mvpRows = clubs.map((club) => {
      let bestPlayer = club.elenco[0];
      let bestStats = getPlayerStats(bestPlayer.id);

      club.elenco.forEach((player) => {
        const stats = getPlayerStats(player.id);
        const notaA = Number(stats.notaMedia);
        const notaB = Number(bestStats.notaMedia);
        const partA = stats.gols + stats.assistencias;
        const partB = bestStats.gols + bestStats.assistencias;

        if (
          notaA > notaB ||
          (notaA === notaB && partA > partB) ||
          (notaA === notaB &&
            partA === partB &&
            player.pesoGol + player.pesoAssistencia >
              bestPlayer.pesoGol + bestPlayer.pesoAssistencia)
        ) {
          bestPlayer = player;
          bestStats = stats;
        }
      });

      return {
        club,
        player: bestPlayer,
        stats: bestStats,
        participations: bestStats.gols + bestStats.assistencias,
        notaNum: Number(bestStats.notaMedia),
      };
    });

    return mvpRows.sort(
      (a, b) =>
        b.notaNum - a.notaNum ||
        b.participations - a.participations ||
        b.player.pesoGol +
          b.player.pesoAssistencia -
          (a.player.pesoGol + a.player.pesoAssistencia) ||
        a.club.id - b.club.id
    );
  }

  function getZoneRowClass(position) {
    if (position <= 4) return 'zone-row-libertadores';
    if (position <= 6) return 'zone-row-pre-libertadores';
    if (position <= 12) return 'zone-row-sulamericana';
    if (position <= 16) return 'zone-row-neutro';
    return 'zone-row-rebaixados';
  }

  function renderStandings() {
    if (!elements.standingsTbody || !elements.standingsThead || clubs.length === 0) return;

    if (standingsView === 'mvp') {
      elements.standingsThead.innerHTML = `
        <tr>
          <th scope="col" class="col-pos" title="Posição">Pos</th>
          <th scope="col" class="col-team">Time</th>
          <th scope="col">Craque (MVP)</th>
          <th scope="col" class="col-num" title="Posição">Pos.</th>
          <th scope="col" class="col-num" title="Gols + Assistências">G+A</th>
          <th scope="col" class="col-num" title="Nota Média">Nota</th>
        </tr>
      `;

      const mvpRows = computeClubMvpRows();
      elements.standingsTbody.innerHTML = mvpRows
        .map((row, idx) => {
          const pos = idx + 1;
          return `
            <tr class="${getZoneRowClass(pos)}">
              <td class="col-pos">${pos}º</td>
              <td class="col-team">
                <div class="team-cell">
                  <span class="team-shield-sm" aria-hidden="true">${row.club.escudo}</span>
                  <span class="team-name-text">${escapeHtml(row.club.sigla)}</span>
                </div>
              </td>
              <td><strong>${escapeHtml(row.player.nome)}</strong></td>
              <td class="col-num"><span class="pos-badge pos-${row.player.posicao}">${row.player.posicao}</span></td>
              <td class="col-num">${row.participations}</td>
              <td class="col-num col-points">${row.stats.notaMedia}</td>
            </tr>
          `;
        })
        .join('');
      return;
    }

    const showDefenseCol = standingsView === 'defesa';
    elements.standingsThead.innerHTML = `
      <tr>
        <th scope="col" class="col-pos" title="Posição">Pos</th>
        <th scope="col" class="col-team">Time</th>
        <th scope="col" class="col-num" title="Pontos">P</th>
        <th scope="col" class="col-num" title="Jogos">J</th>
        <th scope="col" class="col-num" title="Vitórias">V</th>
        <th scope="col" class="col-num" title="Saldo de Gols">SG</th>
        <th scope="col" class="col-num" title="${showDefenseCol ? 'Gols Contra' : 'Gols Pró'}">${showDefenseCol ? 'GC' : 'GP'}</th>
      </tr>
    `;

    const rows = computeStandings(matches, standingsView);
    elements.standingsTbody.innerHTML = rows
      .map((row, idx) => {
        const pos = idx + 1;
        const zoneClass = getZoneRowClass(pos);
        const lastStat = showDefenseCol ? row.GC : row.GP;
        return `
          <tr class="${zoneClass}">
            <td class="col-pos">${pos}º</td>
            <td class="col-team">
              <div class="team-cell">
                <span class="team-shield-sm" aria-hidden="true">${row.club.escudo}</span>
                <span class="team-name-text">${escapeHtml(row.club.nome)}</span>
              </div>
            </td>
            <td class="col-num col-points">${row.P}</td>
            <td class="col-num">${row.J}</td>
            <td class="col-num">${row.V}</td>
            <td class="col-num">${row.SG}</td>
            <td class="col-num">${lastStat}</td>
          </tr>
        `;
      })
      .join('');
  }

  function parseScoreInput(rawValue) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      return null;
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return null;
    }
    return Math.min(parsed, 99);
  }

  function handleScoreChange(matchId, side, inputEl) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const parsed = parseScoreInput(inputEl.value);
    if (parsed !== null && String(parsed) !== inputEl.value) {
      inputEl.value = String(parsed);
    }

    if (side === 'home') {
      match.homeGoals = parsed;
    } else {
      match.awayGoals = parsed;
    }

    ensureMatchEvents(match);
    saveMatches();
    refreshPlayerStatsCache();
    renderStandings();
    renderSquadDetail();
    renderRankings();
    renderSeasonSummary();
  }

  function renderMatches() {
    if (!elements.matchesList || clubs.length === 0) return;

    const roundMatches = matches.filter((m) => m.round === currentRound);
    elements.matchesList.innerHTML = roundMatches
      .map((match) => {
        const home = clubsById[match.homeId];
        const away = clubsById[match.awayId];
        if (!home || !away) return '';

        const homeVal = match.homeGoals !== null ? match.homeGoals : '';
        const awayVal = match.awayGoals !== null ? match.awayGoals : '';

        return `
          <article class="match-card" data-match-id="${match.id}">
            <div class="match-row">
              <div class="match-side match-side-home">
                <span class="match-sigla">${escapeHtml(home.sigla)}</span>
                <span class="match-shield" aria-hidden="true">${home.escudo}</span>
              </div>

              <div class="match-score-box">
                <input
                  type="number"
                  min="0"
                  max="99"
                  inputmode="numeric"
                  class="score-input"
                  data-match-id="${match.id}"
                  data-side="home"
                  value="${homeVal}"
                  aria-label="Gols de ${escapeHtml(home.nome)}"
                />
                <span class="score-x" aria-hidden="true">x</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  inputmode="numeric"
                  class="score-input"
                  data-match-id="${match.id}"
                  data-side="away"
                  value="${awayVal}"
                  aria-label="Gols de ${escapeHtml(away.nome)}"
                />
              </div>

              <div class="match-side match-side-away">
                <span class="match-shield" aria-hidden="true">${away.escudo}</span>
                <span class="match-sigla">${escapeHtml(away.sigla)}</span>
              </div>
            </div>

            <div class="match-actions">
              <button
                type="button"
                class="btn-match-more"
                data-match-id="${match.id}"
              >
                Ver mais
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    elements.matchesList.querySelectorAll('.score-input').forEach((input) => {
      input.addEventListener('input', () => {
        const id = Number(input.dataset.matchId);
        const side = input.dataset.side;
        handleScoreChange(id, side, input);
      });
    });

    elements.matchesList.querySelectorAll('.btn-match-more').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.matchId);
        openMatchModal(id);
      });
    });
  }

  /* ========================
     Motor Silencioso de Eventos & Notas
     ======================== */
  function pickWeighted(items, weightKey) {
    if (!items || items.length === 0) return null;
    const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item[weightKey] || 0), 0);
    if (totalWeight <= 0) {
      return items[Math.floor(Math.random() * items.length)];
    }
    let threshold = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      threshold -= Math.max(0, items[i][weightKey] || 0);
      if (threshold <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function randomMatchMinute() {
    return Math.floor(Math.random() * 94) + 1;
  }

  function formatMinute(minute) {
    if (minute > 90) return `90'+${minute - 90}`;
    return `${minute}'`;
  }

  function recalculateMatchRatings(match) {
    if (!match || !match.events || !isMatchCompleted(match)) return;
    const homeClub = clubsById[match.homeId];
    const awayClub = clubsById[match.awayId];
    if (!homeClub || !awayClub) return;

    const goalsByPlayer = {};
    const assistsByPlayer = {};
    (match.events.goals || []).forEach((g) => {
      goalsByPlayer[g.scorerId] = (goalsByPlayer[g.scorerId] || 0) + 1;
      if (g.assistId) {
        assistsByPlayer[g.assistId] = (assistsByPlayer[g.assistId] || 0) + 1;
      }
    });

    const yellowsByPlayer = {};
    const redsByPlayer = {};
    (match.events.cards || []).forEach((c) => {
      if (c.type === 'yellow') {
        yellowsByPlayer[c.playerId] = (yellowsByPlayer[c.playerId] || 0) + 1;
      } else if (c.type === 'red') {
        redsByPlayer[c.playerId] = (redsByPlayer[c.playerId] || 0) + 1;
      }
    });

    const ratings = {};
    const noiseMap = match.events.ratingNoise || {};

    const applyTeamRatings = (club, goalsFor, goalsAgainst) => {
      const won = goalsFor > goalsAgainst;
      const lost = goalsFor < goalsAgainst;
      const cleanSheet = goalsAgainst === 0;

      club.elenco.forEach((p) => {
        if (typeof noiseMap[p.id] !== 'number') {
          noiseMap[p.id] = Number(((Math.random() * 0.6) - 0.3).toFixed(2));
        }

        let nota = 6.0;
        if (won) nota += 0.5;
        else if (lost) nota -= 0.4;

        nota += (goalsByPlayer[p.id] || 0) * 1.2;
        nota += (assistsByPlayer[p.id] || 0) * 0.8;

        if (cleanSheet && (p.posicao === 'GOL' || p.posicao === 'DEF')) {
          nota += 0.7;
        }

        nota -= (yellowsByPlayer[p.id] || 0) * 0.3;
        nota -= (redsByPlayer[p.id] || 0) * 1.5;
        nota += noiseMap[p.id];

        const clamped = Math.max(0.0, Math.min(10.0, nota));
        ratings[p.id] = Number(clamped.toFixed(1));
      });
    };

    applyTeamRatings(homeClub, match.homeGoals, match.awayGoals);
    applyTeamRatings(awayClub, match.awayGoals, match.homeGoals);

    match.events.ratingNoise = noiseMap;
    match.events.ratings = ratings;
  }

  function generateTeamGoals(club, count) {
    const goals = [];
    for (let i = 0; i < count; i++) {
      const scorer = pickWeighted(club.elenco, 'pesoGol');
      let assistId = null;
      if (scorer && Math.random() < 0.75) {
        const candidates = club.elenco.filter((p) => p.id !== scorer.id);
        const assister = pickWeighted(candidates, 'pesoAssistencia');
        if (assister) assistId = assister.id;
      }
      if (scorer) {
        goals.push({
          clubId: club.id,
          scorerId: scorer.id,
          assistId,
          minute: randomMatchMinute(),
        });
      }
    }
    return goals;
  }

  function generateMatchEvents(match) {
    const homeClub = clubsById[match.homeId];
    const awayClub = clubsById[match.awayId];
    if (!homeClub || !awayClub) return;

    const goals = [
      ...generateTeamGoals(homeClub, match.homeGoals),
      ...generateTeamGoals(awayClub, match.awayGoals),
    ].sort((a, b) => a.minute - b.minute);

    const allStarters = [
      ...homeClub.elenco.map((p) => ({ ...p, clubId: homeClub.id })),
      ...awayClub.elenco.map((p) => ({ ...p, clubId: awayClub.id })),
    ];

    const cards = [];
    const yellowCount = Math.floor(Math.random() * 6); // 0 a 5 amarelos
    for (let i = 0; i < yellowCount; i++) {
      const player = pickWeighted(allStarters, 'pesoCartao');
      if (player) {
        cards.push({
          clubId: player.clubId,
          playerId: player.id,
          type: 'yellow',
          minute: randomMatchMinute(),
        });
      }
    }

    if (Math.random() < 0.1) {
      const player = pickWeighted(allStarters, 'pesoCartao');
      if (player) {
        cards.push({
          clubId: player.clubId,
          playerId: player.id,
          type: 'red',
          minute: randomMatchMinute(),
        });
      }
    }

    cards.sort((a, b) => a.minute - b.minute);

    match.events = {
      goals,
      cards,
      ratings: {},
      ratingNoise: {},
    };

    recalculateMatchRatings(match);
  }

  function ensureMatchEvents(match) {
    if (!match) return;
    if (!isMatchCompleted(match)) {
      match.events = null;
      return;
    }

    if (match.events && Array.isArray(match.events.goals)) {
      const homeCount = match.events.goals.filter((g) => g.clubId === match.homeId).length;
      const awayCount = match.events.goals.filter((g) => g.clubId === match.awayId).length;
      if (homeCount === match.homeGoals && awayCount === match.awayGoals) {
        return;
      }
    }

    generateMatchEvents(match);
  }

  /* ========================
     Modal Súmula ("Ver mais") & Edição Manual
     ======================== */
  function closeMatchModal() {
    if (!elements.matchModal) return;
    elements.matchModal.hidden = true;
    activeModalMatchId = null;
  }

  function buildPlayerOptionsHtml(club, selectedId, includeNone = false, excludeId = null) {
    const noneOpt = includeNone
      ? `<option value="" ${!selectedId ? 'selected' : ''}>Sem assistência</option>`
      : '';
    const options = club.elenco
      .map((p) => {
        const disabled = excludeId && p.id === excludeId ? 'disabled' : '';
        const selected = p.id === selectedId ? 'selected' : '';
        return `<option value="${p.id}" ${selected} ${disabled}>${escapeHtml(p.nome)} (${p.posicao})</option>`;
      })
      .join('');
    return noneOpt + options;
  }

  function renderMatchModal(match, feedbackMsg = '') {
    const home = clubsById[match.homeId];
    const away = clubsById[match.awayId];
    if (!home || !away) return;

    elements.matchModalTitle.textContent = `Súmula — ${match.round}ª Rodada`;
    elements.matchModalSubtitle.textContent = `${home.nome} x ${away.nome}`;

    if (!isMatchCompleted(match)) {
      elements.matchModalBody.innerHTML = `
        <div class="empty-state empty-state-compact">
          <p class="empty-title">Partida ainda não finalizada</p>
          <p class="empty-desc">
            Preencha os dois placares desta partida (ou simule a rodada) para visualizar e editar os eventos da súmula.
          </p>
        </div>
      `;
      elements.matchModalFooter.innerHTML = `
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-dismiss">Fechar</button>
        </div>
      `;
      const dismissBtn = document.getElementById('btn-modal-dismiss');
      if (dismissBtn) dismissBtn.addEventListener('click', closeMatchModal);
      return;
    }

    ensureMatchEvents(match);
    const events = match.events;

    const goalsHtml =
      events.goals.length === 0
        ? '<p class="empty-desc">Nenhum gol marcado na partida.</p>'
        : events.goals
            .map((goal, idx) => {
              const club = clubsById[goal.clubId];
              return `
                <div class="sumula-goal-row">
                  <span class="sumula-minute">${formatMinute(goal.minute)}</span>
                  <span class="sumula-club-tag">${escapeHtml(club.sigla)}</span>
                  <select
                    class="sumula-select sumula-scorer-select"
                    data-goal-index="${idx}"
                    aria-label="Autor do gol ${idx + 1}"
                  >
                    ${buildPlayerOptionsHtml(club, goal.scorerId, false)}
                  </select>
                  <select
                    class="sumula-select sumula-assist-select"
                    data-goal-index="${idx}"
                    aria-label="Assistência do gol ${idx + 1}"
                  >
                    ${buildPlayerOptionsHtml(club, goal.assistId, true, goal.scorerId)}
                  </select>
                </div>
              `;
            })
            .join('');

    const cardsHtml =
      events.cards.length === 0
        ? '<p class="empty-desc">Nenhum cartão aplicado na partida.</p>'
        : events.cards
            .map((card) => {
              const club = clubsById[card.clubId];
              const player = playersById[card.playerId];
              return `
                <div class="sumula-card-item">
                  <span class="sumula-minute">${formatMinute(card.minute)}</span>
                  <span class="card-dot ${card.type === 'red' ? 'card-dot-red' : 'card-dot-yellow'}" aria-hidden="true"></span>
                  <span class="sumula-club-tag">${escapeHtml(club ? club.sigla : '')}</span>
                  <span>${escapeHtml(player ? player.nome : 'Jogador')}</span>
                </div>
              `;
            })
            .join('');

    const buildTeamRatingsHtml = (club) => `
      <div class="sumula-ratings-col">
        <div class="sumula-ratings-header">${escapeHtml(club.nome)}</div>
        ${club.elenco
          .map((p) => {
            const nota =
              events.ratings && typeof events.ratings[p.id] === 'number'
                ? events.ratings[p.id].toFixed(1)
                : '6.0';
            return `
              <div class="sumula-rating-row">
                <div class="sumula-rating-player">
                  <span class="pos-badge pos-${p.posicao}">${p.posicao}</span>
                  <span>${escapeHtml(p.nome)}</span>
                </div>
                <span class="sumula-rating-badge">${nota}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    elements.matchModalBody.innerHTML = `
      <div class="sumula-scoreboard">
        <div class="sumula-team sumula-team-home">
          <span>${escapeHtml(home.nome)}</span>
          <span class="match-shield" aria-hidden="true">${home.escudo}</span>
        </div>
        <div class="sumula-score">${match.homeGoals} x ${match.awayGoals}</div>
        <div class="sumula-team">
          <span class="match-shield" aria-hidden="true">${away.escudo}</span>
          <span>${escapeHtml(away.nome)}</span>
        </div>
      </div>

      <section>
        <h3 class="sumula-section-title">Gols &amp; Assistências (Edição Manual)</h3>
        <div class="sumula-goals-list">${goalsHtml}</div>
      </section>

      <section>
        <h3 class="sumula-section-title">Cartões</h3>
        <div class="sumula-cards-list">${cardsHtml}</div>
      </section>

      <section>
        <h3 class="sumula-section-title">Notas dos Titulares</h3>
        <div class="sumula-ratings-grid">
          ${buildTeamRatingsHtml(home)}
          ${buildTeamRatingsHtml(away)}
        </div>
      </section>
    `;

    elements.matchModalFooter.innerHTML = `
      <span class="modal-save-feedback" aria-live="polite">${escapeHtml(feedbackMsg)}</span>
      <div class="modal-footer-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-dismiss">Fechar</button>
        ${
          events.goals.length > 0
            ? '<button type="button" class="btn btn-primary btn-sm" id="btn-modal-save">Salvar Alterações</button>'
            : ''
        }
      </div>
    `;

    // Impedir autoassistência em tempo real ao trocar o autor do gol
    elements.matchModalBody.querySelectorAll('.sumula-scorer-select').forEach((scorerSelect) => {
      scorerSelect.addEventListener('change', () => {
        const idx = scorerSelect.dataset.goalIndex;
        const newScorerId = Number(scorerSelect.value);
        const assistSelect = elements.matchModalBody.querySelector(
          `.sumula-assist-select[data-goal-index="${idx}"]`
        );
        if (!assistSelect) return;

        Array.from(assistSelect.options).forEach((opt) => {
          opt.disabled = opt.value !== '' && Number(opt.value) === newScorerId;
        });

        if (assistSelect.value !== '' && Number(assistSelect.value) === newScorerId) {
          assistSelect.value = '';
        }
      });
    });

    const dismissBtn = document.getElementById('btn-modal-dismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', closeMatchModal);

    const saveBtn = document.getElementById('btn-modal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => saveMatchModalEdits(match));
    }
  }

  function saveMatchModalEdits(match) {
    if (!match || !match.events) return;

    const scorerSelects = elements.matchModalBody.querySelectorAll('.sumula-scorer-select');
    scorerSelects.forEach((scorerSelect) => {
      const idx = Number(scorerSelect.dataset.goalIndex);
      const goal = match.events.goals[idx];
      if (!goal) return;

      const newScorerId = Number(scorerSelect.value);
      const assistSelect = elements.matchModalBody.querySelector(
        `.sumula-assist-select[data-goal-index="${idx}"]`
      );
      const rawAssist = assistSelect ? assistSelect.value : '';
      const newAssistId = rawAssist ? Number(rawAssist) : null;

      goal.scorerId = newScorerId;
      goal.assistId = newAssistId && newAssistId !== newScorerId ? newAssistId : null;
    });

    recalculateMatchRatings(match);
    saveMatches();
    refreshPlayerStatsCache();
    renderStandings();
    renderSquadDetail();
    renderRankings();
    renderSeasonSummary();
    renderMatchModal(match, 'Alterações salvas!');
  }

  function openMatchModal(matchId) {
    const match = matches.find((m) => m.id === matchId);
    if (!match || !elements.matchModal) return;

    activeModalMatchId = matchId;
    renderMatchModal(match);
    elements.matchModal.hidden = false;
  }

  function initMatchModal() {
    if (!elements.matchModal) return;

    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener('click', closeMatchModal);
    }

    elements.matchModal.addEventListener('click', (e) => {
      if (e.target === elements.matchModal) {
        closeMatchModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elements.matchModal.hidden) {
        closeMatchModal();
      }
    });
  }

  async function loadClubsData() {
    try {
      const response = await fetch('./dados.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      clubs = Array.isArray(data.clubes) ? data.clubes : [];
      clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
      playersById = {};
      clubs.forEach((club) => {
        club.elenco.forEach((p) => {
          playersById[p.id] = p;
        });
      });

      if (clubs.length > 0 && selectedClubId === null) {
        selectedClubId = clubs[0].id;
      }

      loadOrCreateMatches();
      let generatedMissingEvents = false;
      matches.forEach((m) => {
        if (isMatchCompleted(m) && !m.events) {
          ensureMatchEvents(m);
          generatedMissingEvents = true;
        }
      });
      if (generatedMissingEvents) saveMatches();

      refreshPlayerStatsCache();
      renderClubSelector();
      renderSquadDetail();
      renderStandings();
      renderMatches();
      renderRankings();
      renderSeasonSummary();
    } catch (error) {
      console.error('Erro ao carregar ./dados.json:', error);
      if (elements.squadClubSelector) {
        elements.squadClubSelector.innerHTML = `
          <div class="empty-state empty-state-compact">
            <p class="empty-title">Não foi possível carregar dados.json</p>
            <p class="empty-desc">
              Execute a aplicação via servidor local (ex.: Live Server ou GitHub Pages) para permitir o fetch de ./dados.json.
            </p>
          </div>
        `;
      }
      if (elements.squadDetailPanel) {
        elements.squadDetailPanel.innerHTML = '';
      }
    }
  }

  /* ========================
     Aba Rankings & Resumo da Temporada
     ======================== */
  function collectAllPlayerEntries() {
    const entries = [];
    clubs.forEach((club) => {
      club.elenco.forEach((player) => {
        const stats = getPlayerStats(player.id);
        entries.push({
          club,
          player,
          stats,
          notaNum: Number(stats.notaMedia),
          cardScore: stats.vermelhos * 2 + stats.amarelos,
        });
      });
    });
    return entries;
  }

  function renderRankingCard(title, subtitle, items, emptyText, valueBuilder) {
    const listHtml =
      items.length === 0
        ? `<div class="empty-state empty-state-compact"><p class="empty-desc">${escapeHtml(emptyText)}</p></div>`
        : `<div class="ranking-card-list">
            ${items
              .map((item, idx) => {
                const metric = valueBuilder(item);
                return `
                  <div class="ranking-row">
                    <div class="ranking-left">
                      <span class="ranking-pos">${idx + 1}º</span>
                      <span class="team-shield-sm" aria-hidden="true">${item.club.escudo}</span>
                      <div class="ranking-player-info">
                        <span class="ranking-player-name">${escapeHtml(item.player.nome)}</span>
                        <span class="ranking-player-meta">${escapeHtml(item.club.sigla)} • ${item.player.posicao} • ${item.stats.jogos} J</span>
                      </div>
                    </div>
                    <div class="ranking-metric">
                      <span class="ranking-metric-main">${metric.main}</span>
                      <span class="ranking-metric-sub">${metric.sub}</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>`;

    return `
      <article class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">${escapeHtml(title)}</h2>
            <p class="card-subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </div>
        ${listHtml}
      </article>
    `;
  }

  function renderRankings() {
    if (!elements.rankingsContainer || clubs.length === 0) return;

    const allEntries = collectAllPlayerEntries();

    const topScorers = allEntries
      .filter((e) => e.stats.gols > 0)
      .sort(
        (a, b) =>
          b.stats.gols - a.stats.gols ||
          a.stats.jogos - b.stats.jogos ||
          b.stats.assistencias - a.stats.assistencias ||
          a.player.id - b.player.id
      )
      .slice(0, 10);

    const topAssisters = allEntries
      .filter((e) => e.stats.assistencias > 0)
      .sort(
        (a, b) =>
          b.stats.assistencias - a.stats.assistencias ||
          a.stats.jogos - b.stats.jogos ||
          b.stats.gols - a.stats.gols ||
          a.player.id - b.player.id
      )
      .slice(0, 10);

    const topCards = allEntries
      .filter((e) => e.stats.amarelos + e.stats.vermelhos > 0)
      .sort(
        (a, b) =>
          b.cardScore - a.cardScore ||
          b.stats.vermelhos - a.stats.vermelhos ||
          b.stats.amarelos - a.stats.amarelos ||
          a.player.id - b.player.id
      )
      .slice(0, 10);

    const topRated = allEntries
      .filter((e) => e.stats.jogos > 0)
      .sort(
        (a, b) =>
          b.notaNum - a.notaNum ||
          b.stats.gols + b.stats.assistencias - (a.stats.gols + a.stats.assistencias) ||
          b.stats.jogos - a.stats.jogos ||
          a.player.id - b.player.id
      )
      .slice(0, 10);

    elements.rankingsContainer.innerHTML = [
      renderRankingCard(
        'Artilharia',
        'Maiores goleadores do campeonato',
        topScorers,
        'Nenhum gol registrado até o momento.',
        (e) => ({
          main: `${e.stats.gols}`,
          sub: e.stats.gols === 1 ? 'gol' : 'gols',
        })
      ),
      renderRankingCard(
        'Garçons',
        'Líderes em assistências',
        topAssisters,
        'Nenhuma assistência registrada até o momento.',
        (e) => ({
          main: `${e.stats.assistencias}`,
          sub: e.stats.assistencias === 1 ? 'assist.' : 'assists.',
        })
      ),
      renderRankingCard(
        'Mais Cartões',
        'Disciplina (amarelos e vermelhos)',
        topCards,
        'Nenhum cartão aplicado até o momento.',
        (e) => ({
          main: `${e.stats.amarelos + e.stats.vermelhos}`,
          sub: `${e.stats.amarelos} CA • ${e.stats.vermelhos} CV`,
        })
      ),
      renderRankingCard(
        'Craque do Campeonato',
        'Melhores notas médias',
        topRated,
        'Simule partidas para calcular as notas médias.',
        (e) => ({
          main: `${e.stats.notaMedia}`,
          sub: 'nota média',
        })
      ),
    ].join('');
  }

  function renderSeasonSummary() {
    if (!elements.summaryContainer || clubs.length === 0) return;

    const totalMatches = matches.length || 380;
    const completedCount = matches.filter(isMatchCompleted).length;
    const progressPct = ((completedCount / totalMatches) * 100).toFixed(1);

    const standings = computeStandings(matches, 'geral');
    const leader = standings[0];
    const g4 = standings.slice(0, 4);
    const g5g6 = standings.slice(4, 6);
    const z4 = standings.slice(16, 20);

    const aproveitamento =
      leader && leader.J > 0 ? ((leader.P / (leader.J * 3)) * 100).toFixed(1) : '0.0';

    let champTopScorer = null;
    if (leader) {
      leader.club.elenco.forEach((p) => {
        const st = getPlayerStats(p.id);
        if (
          !champTopScorer ||
          st.gols > champTopScorer.stats.gols ||
          (st.gols === champTopScorer.stats.gols &&
            st.assistencias > champTopScorer.stats.assistencias)
        ) {
          champTopScorer = { player: p, stats: st };
        }
      });
    }

    const allEntries = collectAllPlayerEntries();
    const topScorer = [...allEntries]
      .filter((e) => e.stats.gols > 0)
      .sort((a, b) => b.stats.gols - a.stats.gols || a.stats.jogos - b.stats.jogos)[0];
    const topAssister = [...allEntries]
      .filter((e) => e.stats.assistencias > 0)
      .sort(
        (a, b) =>
          b.stats.assistencias - a.stats.assistencias || a.stats.jogos - b.stats.jogos
      )[0];

    const renderZoneClubList = (list, startPos) =>
      list
        .map(
          (row, idx) => `
          <div class="summary-club-item">
            <div class="team-cell">
              <strong style="width: 24px;">${startPos + idx}º</strong>
              <span class="team-shield-sm" aria-hidden="true">${row.club.escudo}</span>
              <span class="team-name-text">${escapeHtml(row.club.nome)}</span>
            </div>
            <strong>${row.P} pts</strong>
          </div>
        `
        )
        .join('');

    const renderLeaderBox = (roleTitle, entry, statKey, emptyLabel) => {
      if (!entry) {
        return `
          <div class="leader-compare-box">
            <span class="leader-role">${roleTitle}</span>
            <p class="empty-desc">${emptyLabel}</p>
          </div>
        `;
      }
      const total = entry.stats[statKey];
      const avg = entry.stats.jogos > 0 ? (total / entry.stats.jogos).toFixed(2) : '0.00';
      return `
        <div class="leader-compare-box">
          <span class="leader-role">${roleTitle}</span>
          <div class="leader-identity">
            <span class="team-shield-sm" aria-hidden="true">${entry.club.escudo}</span>
            <div>
              <div class="leader-name">${escapeHtml(entry.player.nome)}</div>
              <div class="ranking-player-meta">${escapeHtml(entry.club.sigla)} • ${entry.stats.jogos} jogos</div>
            </div>
          </div>
          <div class="leader-numbers">
            <span class="leader-total">${total}</span>
            <span>Média: <strong>${avg}</strong> / jogo</span>
          </div>
        </div>
      `;
    };

    const championStatusText =
      completedCount === totalMatches ? 'Campeão Brasileiro 2027' : 'Líder Atual';

    elements.summaryContainer.innerHTML = `
      <article class="card">
        <div class="summary-progress-body">
          <div class="summary-progress-top">
            <span>Progresso do Campeonato</span>
            <span>${completedCount} / ${totalMatches} jogos (${progressPct}%)</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuenow="${completedCount}" aria-valuemin="0" aria-valuemax="${totalMatches}">
            <div class="progress-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </article>

      <div class="summary-grid">
        <article class="card summary-champion-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">${championStatusText}</h2>
              <p class="card-subtitle">Desempenho do 1º colocado</p>
            </div>
          </div>
          ${
            leader
              ? `<div class="champion-body">
                  <div class="champion-hero">
                    <div class="champion-shield" aria-hidden="true">${leader.club.escudo}</div>
                    <div>
                      <span class="champion-tag">1º Lugar</span>
                      <h3 class="champion-name">${escapeHtml(leader.club.nome)}</h3>
                    </div>
                  </div>
                  <div class="champion-stats">
                    <div class="summary-stat-box">
                      <span class="summary-stat-label">Pontuação</span>
                      <span class="summary-stat-val">${leader.P} pts</span>
                    </div>
                    <div class="summary-stat-box">
                      <span class="summary-stat-label">Aproveitamento</span>
                      <span class="summary-stat-val">${aproveitamento}%</span>
                    </div>
                    <div class="summary-stat-box">
                      <span class="summary-stat-label">Artilheiro</span>
                      <span class="summary-stat-val">${
                        champTopScorer && champTopScorer.stats.gols > 0
                          ? `${escapeHtml(champTopScorer.player.nome)} (${champTopScorer.stats.gols})`
                          : '—'
                      }</span>
                    </div>
                  </div>
                </div>`
              : ''
          }
        </article>

        <article class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Rei da Artilharia &amp; Rei das Assistências</h2>
              <p class="card-subtitle">Líderes individuais da temporada</p>
            </div>
          </div>
          <div class="leaders-compare-grid">
            ${renderLeaderBox('Rei da Artilharia', topScorer, 'gols', 'Sem gols registrados ainda.')}
            ${renderLeaderBox('Rei das Assistências', topAssister, 'assistencias', 'Sem assistências registradas ainda.')}
          </div>
        </article>

        <article class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Classificados ao G6</h2>
              <p class="card-subtitle">Vagas continentais</p>
            </div>
          </div>
          <div class="summary-zone-group">
            <div>
              <h3 class="zone-subgroup-title">G4 — Libertadores (Fase de Grupos)</h3>
              <div class="summary-club-list">${renderZoneClubList(g4, 1)}</div>
            </div>
            <div>
              <h3 class="zone-subgroup-title">G5–G6 — Pré-Libertadores</h3>
              <div class="summary-club-list">${renderZoneClubList(g5g6, 5)}</div>
            </div>
          </div>
        </article>

        <article class="card summary-z4-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Z4 — Zona de Rebaixamento</h2>
              <p class="card-subtitle">Últimos 4 colocados (17º–20º)</p>
            </div>
          </div>
          <div class="summary-zone-group">
            <div class="summary-club-list">${renderZoneClubList(z4, 17)}</div>
          </div>
        </article>
      </div>
    `;
  }

  /* ========================
     Simulação Rápida (Aleatoriedade Ponderada)
     ======================== */
  function sumClubGoalWeight(club) {
    if (!club || !Array.isArray(club.elenco)) return 300;
    return club.elenco.reduce((sum, p) => sum + p.pesoGol, 0);
  }

  function samplePoissonGoals(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L && k < 7);
    return Math.min(k - 1, 6);
  }

  function simulateMatchScore(homeClub, awayClub) {
    const homeAttack = sumClubGoalWeight(homeClub);
    const awayAttack = sumClubGoalWeight(awayClub);
    const avgAttack = (homeAttack + awayAttack) / 2 || 300;

    // Leve vantagem para o mandante (+12%) ponderada pelo pesoGol dos elencos
    const homeLambda = Math.max(0.55, Math.min(2.6, 1.38 * (homeAttack / avgAttack) * 1.12));
    const awayLambda = Math.max(0.45, Math.min(2.4, 1.25 * (awayAttack / avgAttack)));

    return {
      homeGoals: samplePoissonGoals(homeLambda),
      awayGoals: samplePoissonGoals(awayLambda),
    };
  }

  function simulatePendingMatches(onlyCurrentRound) {
    if (clubs.length === 0) return;

    let updated = false;
    matches.forEach((m) => {
      if (onlyCurrentRound && m.round !== currentRound) return;
      if (isMatchCompleted(m)) return;

      const homeClub = clubsById[m.homeId];
      const awayClub = clubsById[m.awayId];
      if (!homeClub || !awayClub) return;

      const score = simulateMatchScore(homeClub, awayClub);
      m.homeGoals = score.homeGoals;
      m.awayGoals = score.awayGoals;
      ensureMatchEvents(m);
      updated = true;
    });

    if (updated) {
      saveMatches();
      refreshPlayerStatsCache();
      renderMatches();
      renderStandings();
      renderSquadDetail();
      renderRankings();
      renderSeasonSummary();
    }
  }

  function initStandingsAndSimulationControls() {
    if (elements.standingsViewSelect) {
      elements.standingsViewSelect.addEventListener('change', (e) => {
        standingsView = e.target.value;
        renderStandings();
      });
    }

    if (elements.btnSimRound) {
      elements.btnSimRound.addEventListener('click', () => {
        simulatePendingMatches(true);
      });
    }

    if (elements.btnSimRemaining) {
      elements.btnSimRemaining.addEventListener('click', () => {
        simulatePendingMatches(false);
      });
    }
  }

  /* ========================
     Reset Global
     ======================== */
  function initResetButton() {
    elements.btnResetChampionship.addEventListener('click', () => {
      const confirmed = window.confirm(
        'Deseja resetar todos os dados do campeonato? O tema escolhido será mantido.'
      );
      if (!confirmed) return;

      const currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
      localStorage.clear();
      localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);

      currentRound = 1;
      standingsView = 'geral';
      if (elements.standingsViewSelect) {
        elements.standingsViewSelect.value = 'geral';
      }
      updateRoundUI();
      applySpoilerState(false);
      activateTab('tabela-jogos');

      if (clubs.length > 0) {
        matches = generateRoundRobinSchedule(clubs);
        saveMatches();
        refreshPlayerStatsCache();
        renderStandings();
        renderMatches();
        renderSquadDetail();
        renderRankings();
        renderSeasonSummary();
      }
      closeMatchModal();
    });
  }

  /* ========================
     Inicialização
     ======================== */
  function init() {
    initTheme();
    initTabs();
    initSpoilerMode();
    initRoundNavigator();
    initStandingsAndSimulationControls();
    initMatchModal();
    initResetButton();
    loadClubsData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
