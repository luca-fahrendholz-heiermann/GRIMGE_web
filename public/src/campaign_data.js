// GRIMGE Prototype — campaign data (Campaign Alpha 0.1; user directive, 11 Nov 2026). Data-driven: a chapter is a list
// of missions; a mission reuses an existing game mode with parameters (params), has a briefing, an intro and an outro
// dialogue and a reward. New chapters / missions are added here without touching the campaign logic (campaign.js).
// The story is a PROPOSAL compatible with what exists (Thesen, Xame, runes, the Grimoire, the rune rim, the chasm,
// castles, the fire lord) — see GRIMGE_DESIGN_BIBLE.md; nothing here is fixed canon until the user approves it.
//
// params per mode (read by main.js through game.campaignParams()):
//   dungeon   startStage (first room after the scout, default 1), endStage (win when this room is cleared; omit = boss)
//   invasion  maxLevel (win after the boss of this level)
//   arena     rival (hero key of the champion), rivalName
//   siege     —
// speakers: a hero key shown as the portrait ('thesen', 'xame', 'boss_firelord') or 'narrator'.

export const CAMPAIGN = Object.freeze([
  Object.freeze({
    id: 'c1', title: 'KAPITEL 1 — DER GEBROCHENE BANN',
    summary: 'Der Bannrand, der den Abgrund seit Generationen verschließt, reißt. Aus den Rissen kriecht, was die Runen einst gebannt haben.',
    missions: Object.freeze([
      Object.freeze({
        id: 'c1m1', title: 'ASCHE ÜBER KARETH', kind: 'DUNGEON', mode: 'dungeon', params: Object.freeze({ endStage: 1 }),
        briefing: 'Die Wachfeste Kareth schweigt. Dring in die Ruinen ein, schlag dich durch die erste Halle und finde heraus, was den Bannrand gebrochen hat.',
        goal: 'Räume die erste Halle der Ruinen.',
        intro: [
          { who: 'narrator', text: 'Seit dem Runenkrieg hält der Bannrand den Abgrund verschlossen. Heute Nacht erlosch sein Licht über Kareth.' },
          { who: 'thesen', text: 'Kein Horn, kein Feuer auf den Mauern. Kareth fällt nicht lautlos. Etwas hat die Wächter überrascht.' },
          { who: 'thesen', text: 'Ich habe nur die Runen, die ich unterwegs finde. Es muss reichen.' }
        ],
        outro: [
          { who: 'thesen', text: 'Leerenräuber. In den Hallen der Wächter. Die Runen an der Wand sind von innen gebrochen worden.' },
          { who: 'narrator', text: 'Zwischen den Trümmern liegt ein Siegelsplitter. Die Bruchkante ist frisch. Jemand hat den Bann geöffnet, nicht überrannt.' }
        ],
        reward: Object.freeze({ xp: 80, skillPoints: 1 })
      }),
      Object.freeze({
        id: 'c1m2', title: 'DIE MAUER HÄLT', kind: 'VERTEIDIGUNG', mode: 'invasion', params: Object.freeze({ maxLevel: 1 }),
        briefing: 'Die Flüchtlinge aus Kareth erreichen die Grenzburg. Hinter ihnen kommt die erste Welle. Halte die Burg, bis der Anführer fällt.',
        goal: 'Verteidige die Burg gegen die Wellen und besiege den Anführer.',
        intro: [
          { who: 'narrator', text: 'Die Grenzburg Halvar ist die letzte Mauer vor dem Tiefland. Ihre Türme sind alt, aber sie stehen.' },
          { who: 'thesen', text: 'Sie kommen über das offene Land. Gut. Dann sehe ich sie kommen.' },
          { who: 'thesen', text: 'Türme, haltet die Flanken. Der Rest gehört mir.' }
        ],
        outro: [
          { who: 'thesen', text: 'Die Mauer steht. Aber das war kein Schwarm. Das war ein Befehl. Jemand lenkt sie.' },
          { who: 'narrator', text: 'Am Rand des Schlachtfelds steht eine Gestalt mit einem Schädel am Gürtel und sieht zu. Dann ist sie fort.' }
        ],
        reward: Object.freeze({ xp: 100, skillPoints: 1 })
      }),
      Object.freeze({
        id: 'c1m3', title: 'DER SCHÄDELHEXER', kind: 'DUELL', mode: 'arena', params: Object.freeze({ rival: 'xame', rivalName: 'XAME' }),
        briefing: 'Der Beobachter stellt sich: Xame, der Schädelhexer. Er hält den zweiten Siegelsplitter. Wirf ihn aus dem Kreis, bevor er dich hinauswirft.',
        goal: 'Duell nach Riss-Regeln: Schleudere Xame dreimal aus der Arena.',
        intro: [
          { who: 'xame', text: 'Du trägst den Splitter aus Kareth. Leg ihn hin, Gehörnter. Der Bann war ein Käfig, kein Schutz.' },
          { who: 'thesen', text: 'Ein Käfig für das, was meine Leute gefressen hat. Du hast die Tür geöffnet.' },
          { who: 'xame', text: 'Ich habe sie nur angelehnt gefunden. Zeig mir, ob du stark genug bist, sie wieder zu schließen.' }
        ],
        outro: [
          { who: 'xame', text: 'Genug. Du schlägst wie einer, der noch etwas zu verlieren hat.' },
          { who: 'xame', text: 'Den Bann hat der Glutfürst gebrochen. Ich wollte nur sehen, was dahinter liegt. Seine Feste steht in der Aschenebene.' },
          { who: 'thesen', text: 'Dann ist das mein nächster Weg. Und du gehst mir aus dem Licht, Hexer.' }
        ],
        reward: Object.freeze({ xp: 120, skillPoints: 1 })
      }),
      Object.freeze({
        id: 'c1m4', title: 'STURM AUF DIE ASCHENFESTE', kind: 'BELAGERUNG', mode: 'siege', params: Object.freeze({}),
        briefing: 'Die Aschenfeste bewacht den Weg zum Glutfürsten. Führe den Sturm: erst die Türme, dann die Burg.',
        goal: 'Castle Siege: Zerstöre die Türme und die feindliche Burg.',
        intro: [
          { who: 'narrator', text: 'Halvars Truppen folgen dem Gehörnten in die Aschenebene. Vor ihnen ragt die Feste aus dem Rauch.' },
          { who: 'thesen', text: 'Ihre Türme decken die Bahn. Fällt der Turm, fällt die Mauer. Bleibt bei mir.' }
        ],
        outro: [
          { who: 'thesen', text: 'Die Feste ist gefallen. Darunter führen Stufen in die Tiefe. Dort unten brennt etwas.' },
          { who: 'narrator', text: 'Der dritte Siegelsplitter glüht im Stein des Tores. Er zeigt nach unten.' }
        ],
        reward: Object.freeze({ xp: 140, skillPoints: 1 })
      }),
      Object.freeze({
        id: 'c1m5', title: 'DER GLUTFÜRST', kind: 'BOSS', mode: 'dungeon', params: Object.freeze({ startStage: 3 }),
        briefing: 'Unter der Aschenfeste wartet der Glutfürst, der den Bann gebrochen hat. Schlag dich durch seine Garde und stell ihn.',
        goal: 'Besiege die Garde und den Glutfürsten.',
        intro: [
          { who: 'boss_firelord', text: 'Der letzte Wächter von Kareth. Du kommst spät. Der Rand ist offen, und der Abgrund hat Hunger.' },
          { who: 'thesen', text: 'Dann schließe ich ihn mit dem, was von dir übrig bleibt.' }
        ],
        outro: [
          { who: 'thesen', text: 'Drei Splitter. Der Bann lässt sich neu schmieden. Aber nicht hier und nicht von mir allein.' },
          { who: 'xame', text: 'Sieh nach unten, Gehörnter. Der Glutfürst war nicht der, der gerufen hat. Er war der, der geantwortet hat.' },
          { who: 'narrator', text: 'Tief im Abgrund öffnet sich ein Auge. — Ende von Kapitel 1.' }
        ],
        reward: Object.freeze({ xp: 200, skillPoints: 2 })
      })
    ])
  })
]);

export const allMissions = () => CAMPAIGN.flatMap((c) => c.missions);
export const missionById = (id) => allMissions().find((m) => m.id === id) ?? null;
export const chapterOf = (id) => CAMPAIGN.find((c) => c.missions.some((m) => m.id === id)) ?? null;
