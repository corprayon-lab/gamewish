"use strict";

/* ===== HTML ET CANVAS ===== */

const $ = (id) => document.getElementById(id);

const canvas = $("canvas-jeu");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const hud = {
  score: $("score"),
  vies: $("vies"),
  vague: $("vague"),
  bonus: $("statut-bonus"),
  jauge: $("jauge-bonus"),
  duree: $("duree-bonus")
};

const ecrans = {
  accueil: $("ecran-accueil"),
  pause: $("ecran-pause"),
  fin: $("ecran-fin")
};

const aleatoire = (min, max) =>
  min + Math.random() * (max - min);

const limiter = (valeur, min, max) =>
  Math.max(min, Math.min(max, valeur));

/* ===== ÉTAT ===== */

let etat = "accueil";
let derniereFrame = null;

let score = 0;
let vies = 3;
let vague = 1;

let ennemisACreer = 0;
let delaiEnnemi = 0;
let delaiVague = -1;
let banniere = 0;
let secousse = 0;

let niveauTir = 1;
let tempsBonus = 0;

const dureeBonus = 12;

const joueur = {
  x: W / 2,
  y: H - 100,
  rayon: 17,
  vitesse: 320,
  invulnerable: 0,
  delaiTir: 0,
  delaiReacteur: 0
};

const tirs = [];
const tirsEnnemis = [];
const ennemis = [];
const bonus = [];
const particules = [];

/* ===== COMMANDES ===== */

const clavier = new Set();
const directionsTactiles = new Map();
const tirsTactiles = new Set();

let espace = false;

const commandes = {
  ArrowLeft: "gauche",
  ArrowRight: "droite",
  ArrowUp: "haut",
  ArrowDown: "bas",

  KeyQ: "gauche",
  KeyA: "gauche",
  KeyD: "droite",
  KeyZ: "haut",
  KeyW: "haut",
  KeyS: "bas"
};

function directionActive(direction) {
  for (const code of clavier) {
    if (commandes[code] === direction) return true;
  }

  for (const valeur of directionsTactiles.values()) {
    if (valeur === direction) return true;
  }

  return false;
}

function reinitialiserCommandes() {
  clavier.clear();
  directionsTactiles.clear();
  tirsTactiles.clear();
  espace = false;
}

/* ===== DÉCOR ÉTOILÉ : TROIS COUCHES ===== */

const etoiles = [];

for (let couche = 0; couche < 3; couche++) {
  const nombre = [65, 38, 20][couche];

  for (let i = 0; i < nombre; i++) {
    etoiles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      rayon: [0.7, 1.1, 1.6][couche],
      vitesse: [20, 52, 105][couche],
      alpha: [0.3, 0.55, 0.9][couche]
    });
  }
}

const fond = ctx.createLinearGradient(0, 0, 0, H);
fond.addColorStop(0, "#070a20");
fond.addColorStop(1, "#02040d");

const nebuleuse = ctx.createRadialGradient(
  W * 0.8, H * 0.25, 0,
  W * 0.8, H * 0.25, W * 0.9
);

nebuleuse.addColorStop(0, "rgba(90, 28, 160, 0.24)");
nebuleuse.addColorStop(1, "rgba(90, 28, 160, 0)");

function actualiserEtoiles(delta) {
  for (const etoile of etoiles) {
    etoile.y += etoile.vitesse * delta;

    if (etoile.y > H + 4) {
      etoile.y = -4;
      etoile.x = Math.random() * W;
    }
  }
}

function dessinerFond() {
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = nebuleuse;
  ctx.fillRect(0, 0, W, H);

  for (const etoile of etoiles) {
    ctx.globalAlpha = etoile.alpha;
    ctx.fillStyle = "#c9edff";

    ctx.fillRect(
      etoile.x,
      etoile.y,
      etoile.rayon,
      etoile.rayon * 2.1
    );
  }

  ctx.globalAlpha = 1;
}

/* ===== PARTICULES ===== */

function ajouterParticule(
  x, y, vx, vy, couleur, vie, taille
) {
  if (particules.length >= 500) return;

  particules.push({
    x, y, vx, vy,
    couleur,
    vie,
    vieMax: vie,
    taille
  });
}

function explosion(x, y, couleur, nombre = 25) {
  for (let i = 0; i < nombre; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vitesse = aleatoire(45, 220);

    ajouterParticule(
      x, y,
      Math.cos(angle) * vitesse,
      Math.sin(angle) * vitesse,
      i % 4 === 0 ? "#ffffff" : couleur,
      aleatoire(0.25, 0.75),
      aleatoire(1.5, 4)
    );
  }
}

function actualiserParticules(delta) {
  for (let i = particules.length - 1; i >= 0; i--) {
    const p = particules[i];

    p.vie -= delta;
    p.x += p.vx * delta;
    p.y += p.vy * delta;

    if (p.vie <= 0) particules.splice(i, 1);
  }
}

function dessinerParticules() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const p of particules) {
    ctx.globalAlpha = p.vie / p.vieMax;
    ctx.fillStyle = p.couleur;
    ctx.shadowColor = p.couleur;
    ctx.shadowBlur = 9;

    ctx.fillRect(
      p.x - p.taille / 2,
      p.y - p.taille / 2,
      p.taille,
      p.taille
    );
  }

  ctx.restore();
}

/* ===== VAGUES ===== */

function commencerVague() {
  ennemisACreer = 5 + vague * 2;
  delaiEnnemi = 0.6;
  delaiVague = -1;
  banniere = 2.2;
}

function creerEnnemi() {
  const choix = Math.random();

  let type = "classique";

  if (vague >= 2 && choix < 0.28) {
    type = "diagonal";
  } else if (vague >= 3 && choix < 0.55) {
    type = "tireur";
  }

  const depuisGauche = Math.random() < 0.5;
  const vitesse = Math.min(185, 70 + vague * 8);

  ennemis.push({
    type,
    x: type === "diagonal"
      ? (depuisGauche ? 24 : W - 24)
      : aleatoire(35, W - 35),
    y: -35,
    vx: type === "diagonal"
      ? (depuisGauche ? 100 : -100)
      : 0,
    vy: type === "tireur" ? vitesse * 0.7 : vitesse,
    rayon: type === "tireur" ? 22 : 19,
    pv: type === "tireur" ? 3 : 1,
    temps: 0,
    phase: Math.random() * Math.PI * 2,
    delaiTir: aleatoire(1, 2),
    couleur: type === "tireur"
      ? "#ff9b27"
      : type === "diagonal"
        ? "#ff476d"
        : "#ff3e38"
  });
}

function actualiserVagues(delta) {
  if (ennemisACreer > 0) {
    delaiEnnemi -= delta;

    if (delaiEnnemi <= 0) {
      creerEnnemi();
      ennemisACreer--;

      delaiEnnemi = Math.max(0.35, 0.95 - vague * 0.035);
    }
  }

  if (ennemisACreer === 0 && ennemis.length === 0) {
    if (delaiVague < 0) delaiVague = 2.4;

    delaiVague -= delta;

    if (delaiVague <= 0) {
      vague++;
      commencerVague();
    }
  }
}

/* ===== JOUEUR ===== */

function actualiserJoueur(delta) {
  let dx = 0;
  let dy = 0;

  if (directionActive("gauche")) dx--;
  if (directionActive("droite")) dx++;
  if (directionActive("haut")) dy--;
  if (directionActive("bas")) dy++;

  const longueur = Math.hypot(dx, dy);

  if (longueur > 0) {
    dx /= longueur;
    dy /= longueur;
  }

  joueur.x = limiter(
    joueur.x + dx * joueur.vitesse * delta,
    32,
    W - 32
  );

  joueur.y = limiter(
    joueur.y + dy * joueur.vitesse * delta,
    40,
    H - 64
  );

  joueur.invulnerable = Math.max(
    0,
    joueur.invulnerable - delta
  );

  joueur.delaiTir = Math.max(0, joueur.delaiTir - delta);

  if (
    (espace || tirsTactiles.size > 0) &&
    joueur.delaiTir <= 0
  ) {
    tirer();
    joueur.delaiTir = 0.16;
  }

  joueur.delaiReacteur -= delta;

  if (joueur.delaiReacteur <= 0) {
    joueur.delaiReacteur = 0.025;

    ajouterParticule(
      joueur.x + aleatoire(-5, 5),
      joueur.y + 31,
      aleatoire(-16, 16),
      aleatoire(95, 180),
      Math.random() < 0.5 ? "#20bfff" : "#a1ffff",
      aleatoire(0.18, 0.38),
      aleatoire(2, 4)
    );
  }

  if (tempsBonus > 0) {
    tempsBonus = Math.max(0, tempsBonus - delta);

    if (tempsBonus === 0) niveauTir = 1;
  }
}

function tirer() {
  sonLaser();
  const ajouter = (decalage, vx = 0) => {
    tirs.push({
      x: joueur.x + decalage,
      y: joueur.y - 31,
      vx,
      vy: -650,
      rayon: 4
    });
  };

  if (niveauTir === 1) {
    ajouter(0);
  } else if (niveauTir === 2) {
    ajouter(-10);
    ajouter(10);
  } else {
    ajouter(0);
    ajouter(-13, -110);
    ajouter(13, 110);
  }
}

function dessinerVaisseau(temps) {
  ctx.save();
  ctx.translate(joueur.x, joueur.y);

  if (
    joueur.invulnerable > 0 &&
    Math.floor(temps / 90) % 2 === 0
  ) {
    ctx.globalAlpha = 0.4;
  }

  const longueurFlamme = 22 + Math.sin(temps / 65) * 6;

  const flamme = ctx.createLinearGradient(
    0, 20, 0, 32 + longueurFlamme
  );

  flamme.addColorStop(0, "#fff");
  flamme.addColorStop(0.3, "#70f5ff");
  flamme.addColorStop(0.65, "#258cff");
  flamme.addColorStop(1, "rgba(60,60,255,0)");

  ctx.fillStyle = flamme;
  ctx.shadowColor = "#00d9ff";
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.moveTo(-9, 22);
  ctx.quadraticCurveTo(-10, 36, 0, 32 + longueurFlamme);
  ctx.quadraticCurveTo(10, 36, 9, 22);
  ctx.closePath();
  ctx.fill();

  const ailes = ctx.createLinearGradient(-24, 0, 24, 25);
  ailes.addColorStop(0, "#38558a");
  ailes.addColorStop(0.4, "#c5e7ff");
  ailes.addColorStop(0.6, "#658cb7");
  ailes.addColorStop(1, "#1a2c50");

  ctx.fillStyle = ailes;
  ctx.strokeStyle = "#6ee7ff";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-24, 21);
  ctx.lineTo(-23, 29);
  ctx.lineTo(-7, 20);
  ctx.lineTo(7, 20);
  ctx.lineTo(23, 29);
  ctx.lineTo(24, 21);
  ctx.lineTo(8, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const metal = ctx.createLinearGradient(-12, 0, 12, 0);
  metal.addColorStop(0, "#345780");
  metal.addColorStop(0.35, "#dcf7ff");
  metal.addColorStop(0.55, "#8db7da");
  metal.addColorStop(1, "#243d65");

  ctx.fillStyle = metal;
  ctx.strokeStyle = "#b9f5ff";
  ctx.shadowBlur = 5;

  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(11, -5);
  ctx.lineTo(10, 24);
  ctx.lineTo(-10, 24);
  ctx.lineTo(-11, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const cockpit = ctx.createLinearGradient(0, -20, 0, 9);
  cockpit.addColorStop(0, "#d9ffff");
  cockpit.addColorStop(0.35, "#38dfff");
  cockpit.addColorStop(1, "#123e9c");

  ctx.fillStyle = cockpit;
  ctx.strokeStyle = "#83efff";
  ctx.shadowColor = "#00c8ff";
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(9, -7, 6, 8);
  ctx.lineTo(-6, 8);
  ctx.quadraticCurveTo(-9, -7, 0, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#00f3ff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(-17, 19);
  ctx.lineTo(-12, 9);
  ctx.moveTo(17, 19);
  ctx.lineTo(12, 9);
  ctx.stroke();

  if (joueur.invulnerable > 0) {
    ctx.strokeStyle = "#80f5ff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/* ===== ENNEMIS ET PROJECTILES ===== */

function actualiserEnnemis(delta) {
  for (let i = ennemis.length - 1; i >= 0; i--) {
    const e = ennemis[i];

    e.temps += delta;
    e.y += e.vy * delta;

    if (e.type === "diagonal") {
      e.x += e.vx * delta;

      if (e.x < 23 || e.x > W - 23) {
        e.x = limiter(e.x, 23, W - 23);
        e.vx *= -1;
      }
    } else {
      e.x += Math.sin(e.temps * 2 + e.phase) * 24 * delta;
      e.x = limiter(e.x, 25, W - 25);
    }

    if (e.type === "tireur") {
      e.delaiTir -= delta;

      if (e.delaiTir <= 0 && e.y > 15 && e.y < H - 100) {
        const dx = joueur.x - e.x;
        const dy = joueur.y - e.y;
        const distance = Math.hypot(dx, dy) || 1;
        const vitesse = Math.min(260, 155 + vague * 6);

        tirsEnnemis.push({
          x: e.x,
          y: e.y + 20,
          vx: dx / distance * vitesse,
          vy: dy / distance * vitesse,
          rayon: 5
        });

        e.delaiTir = Math.max(0.85, 2.2 - vague * 0.06);
      }
    }

    if (e.y > H + 45) {
      ennemis.splice(i, 1);
    }
  }
}

function actualiserProjectiles(liste, delta) {
  for (let i = liste.length - 1; i >= 0; i--) {
    const p = liste[i];

    p.x += p.vx * delta;
    p.y += p.vy * delta;

    if (
      p.y < -35 || p.y > H + 35 ||
      p.x < -35 || p.x > W + 35
    ) {
      liste.splice(i, 1);
    }
  }
}

function dessinerEnnemis() {
  for (const e of ennemis) {
    ctx.save();
    ctx.translate(e.x, e.y);

    ctx.shadowColor = e.couleur;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = e.couleur;
    ctx.lineWidth = 2;

    const metal = ctx.createLinearGradient(0, -24, 0, 24);
    metal.addColorStop(0, "#592338");
    metal.addColorStop(0.5, "#251326");
    metal.addColorStop(1, e.couleur);

    ctx.fillStyle = metal;
    ctx.beginPath();

    if (e.type === "tireur") {
      ctx.moveTo(-24, -14);
      ctx.lineTo(-12, -23);
      ctx.lineTo(12, -23);
      ctx.lineTo(24, -14);
      ctx.lineTo(20, 15);
      ctx.lineTo(8, 12);
      ctx.lineTo(0, 25);
      ctx.lineTo(-8, 12);
      ctx.lineTo(-20, 15);
    } else if (e.type === "diagonal") {
      ctx.moveTo(0, 25);
      ctx.lineTo(-23, -15);
      ctx.lineTo(-6, -7);
      ctx.lineTo(0, -23);
      ctx.lineTo(6, -7);
      ctx.lineTo(23, -15);
    } else {
      ctx.moveTo(0, 24);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-23, 12);
      ctx.lineTo(-16, -18);
      ctx.lineTo(0, -8);
      ctx.lineTo(16, -18);
      ctx.lineTo(23, 12);
      ctx.lineTo(10, 8);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffe4b5";
    ctx.shadowBlur = 12;
    ctx.fillRect(-6, -4, 12, 7);

    if (e.type === "tireur") {
      ctx.fillStyle = "#ffe29a";

      for (let i = 0; i < e.pv; i++) {
        ctx.fillRect(-8 + i * 6, -16, 4, 3);
      }
    }

    ctx.restore();
  }
}

function dessinerProjectiles() {
  ctx.save();

  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 15;

  for (const tir of tirs) {
    ctx.fillStyle = "#bfffff";
    ctx.fillRect(tir.x - 2, tir.y - 11, 4, 22);
  }

  ctx.shadowColor = "#ff6d38";

  for (const tir of tirsEnnemis) {
    ctx.fillStyle = "#ffb35b";
    ctx.beginPath();
    ctx.arc(tir.x, tir.y, tir.rayon, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* ===== BONUS ===== */

function creerBonus(x, y) {
  const choix = Math.random();

  bonus.push({
    x,
    y,
    rayon: 15,
    temps: 0,
    type: choix < 0.2
      ? "vie"
      : choix < 0.6
        ? "double"
        : "triple"
  });
}

function actualiserBonus(delta) {
  for (let i = bonus.length - 1; i >= 0; i--) {
    const b = bonus[i];

    b.y += 75 * delta;
    b.temps += delta;

    if (b.y > H + 25) bonus.splice(i, 1);
  }
}

function dessinerBonus() {
  for (const b of bonus) {
    const couleur = b.type === "vie"
      ? "#68ffb7"
      : b.type === "triple"
        ? "#e173ff"
        : "#5ceaff";

    ctx.save();
    ctx.translate(b.x, b.y);

    const taille = 1 + Math.sin(b.temps * 5) * 0.07;
    ctx.scale(taille, taille);

    ctx.shadowColor = couleur;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = couleur;
    ctx.lineWidth = 2;
    ctx.fillStyle = "#0a1831";

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = couleur;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      b.type === "vie" ? "+" : b.type === "double" ? "II" : "III",
      0,
      1
    );

    ctx.restore();
  }
}

function recupererBonus(b) {
  sonBonus();
  if (b.type === "vie") {
    vies = Math.min(5, vies + 1);
  } else {
    const nouveauNiveau = b.type === "double" ? 2 : 3;

    // Un bonus double ne réduit pas un triple déjà actif.
    niveauTir = Math.max(niveauTir, nouveauNiveau);
    tempsBonus = dureeBonus;
  }

  explosion(
    b.x,
    b.y,
    b.type === "vie" ? "#68ffb7" : "#71eaff",
    15
  );
}

/* ===== COLLISIONS ===== */

function collision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rayon = a.rayon + b.rayon;

  return dx * dx + dy * dy < rayon * rayon;
}

function toucherJoueur() {
  if (joueur.invulnerable > 0 || etat !== "jeu") return;

  vies--;
  sonDegats();
  joueur.invulnerable = 1.8;
  secousse = 0.25;

  explosion(joueur.x, joueur.y, "#5eeaff", 22);

  if (vies <= 0) terminerPartie();
}

function verifierCollisions() {
  // Lasers du joueur contre les ennemis.
  for (let i = tirs.length - 1; i >= 0; i--) {
    const tir = tirs[i];

    for (let j = ennemis.length - 1; j >= 0; j--) {
      const e = ennemis[j];

      if (!collision(tir, e)) continue;

      tirs.splice(i, 1);
      e.pv--;

      if (e.pv <= 0) {
        ennemis.splice(j, 1);

        score += e.type === "tireur"
          ? 250
          : e.type === "diagonal"
            ? 150
            : 100;

        explosion(e.x, e.y, e.couleur);
        bruitExplosion();

        if (Math.random() < 0.24) {
          creerBonus(e.x, e.y);
        }
      } else {
        explosion(tir.x, tir.y, "#ffe8bc", 5);
      }

      break;
    }
  }

  // Bonus ramassés.
  for (let i = bonus.length - 1; i >= 0; i--) {
    if (collision(joueur, bonus[i])) {
      recupererBonus(bonus[i]);
      bonus.splice(i, 1);
    }
  }

  if (joueur.invulnerable > 0) return;

  // Projectiles ennemis.
  for (let i = tirsEnnemis.length - 1; i >= 0; i--) {
    if (collision(joueur, tirsEnnemis[i])) {
      tirsEnnemis.splice(i, 1);
      toucherJoueur();
      return;
    }
  }

  // Contact direct avec un ennemi.
  for (let i = ennemis.length - 1; i >= 0; i--) {
    const e = ennemis[i];

    if (collision(joueur, e)) {
      explosion(e.x, e.y, e.couleur);
      ennemis.splice(i, 1);
      toucherJoueur();
      return;
    }
  }
}

/* ===== HUD ===== */

function actualiserHUD() {
  hud.score.textContent = score;
  hud.vies.textContent = vies;
  hud.vague.textContent = vague;

  hud.bonus.textContent = niveauTir === 1
    ? "LASER SIMPLE"
    : `${niveauTir === 2 ? "DOUBLE" : "TRIPLE"} · ${Math.ceil(tempsBonus)} s`;

  const pourcentage = tempsBonus / dureeBonus * 100;

  hud.duree.style.width = `${pourcentage}%`;

  hud.jauge.setAttribute(
    "aria-valuenow",
    String(Math.round(pourcentage))
  );
}

/* ===== GESTION DE PARTIE ===== */

function demarrerPartie() {
  if (etat === "jeu" || etat === "pause") return;

  reinitialiserCommandes();

  tirs.length = 0;
  tirsEnnemis.length = 0;
  ennemis.length = 0;
  bonus.length = 0;
  particules.length = 0;

  score = 0;
  vies = 3;
  vague = 1;

  niveauTir = 1;
  tempsBonus = 0;
  secousse = 0;

  joueur.x = W / 2;
  joueur.y = H - 100;
  joueur.invulnerable = 1.5;
  joueur.delaiTir = 0;
  joueur.delaiReacteur = 0;

  ecrans.accueil.hidden = true;
  ecrans.fin.hidden = true;
  ecrans.pause.hidden = true;

  $("bouton-pause").disabled = false;
  $("bouton-pause").textContent = "PAUSE";

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  etat = "jeu";
  derniereFrame = null;

  commencerVague();
  actualiserHUD();
}

function terminerPartie() {
  etat = "fin";

  reinitialiserCommandes();

  explosion(joueur.x, joueur.y, "#80edff", 55);

  $("score-final").textContent = score;
  $("vague-finale").textContent = vague;
  $("bouton-pause").disabled = true;

  ecrans.fin.hidden = false;
}

function basculerPause() {
  if (etat !== "jeu" && etat !== "pause") return;

  etat = etat === "jeu" ? "pause" : "jeu";

  reinitialiserCommandes();
  derniereFrame = null;

  ecrans.pause.hidden = etat !== "pause";

  $("bouton-pause").textContent =
    etat === "pause" ? "REPRENDRE" : "PAUSE";
}

/* ===== MISE À JOUR ET AFFICHAGE ===== */

function actualiser(delta) {
  actualiserJoueur(delta);
  actualiserVagues(delta);
  actualiserEnnemis(delta);

  actualiserProjectiles(tirs, delta);
  actualiserProjectiles(tirsEnnemis, delta);

  actualiserBonus(delta);
  verifierCollisions();

  banniere = Math.max(0, banniere - delta);
  secousse = Math.max(0, secousse - delta);

  actualiserHUD();
}

function dessiner(temps) {
  dessinerFond();

  ctx.save();

  if (secousse > 0) {
    ctx.translate(
      aleatoire(-4, 4),
      aleatoire(-4, 4)
    );
  }

  dessinerBonus();
  dessinerProjectiles();
  dessinerEnnemis();
  dessinerParticules();

  if (etat !== "fin") {
    dessinerVaisseau(temps);
  }

  ctx.restore();

  if (banniere > 0 && etat === "jeu") {
    ctx.save();

    ctx.globalAlpha = Math.min(1, banniere);
    ctx.fillStyle = "#bcf6ff";
    ctx.shadowColor = "#00c8ff";
    ctx.shadowBlur = 15;
    ctx.font = "bold 29px Arial";
    ctx.textAlign = "center";

    ctx.fillText(`VAGUE ${vague}`, W / 2, H * 0.32);

    ctx.restore();
  }
}

function boucleJeu(temps) {
  const delta = derniereFrame === null
    ? 0
    : limiter((temps - derniereFrame) / 1000, 0, 0.04);

  derniereFrame = temps;

  if (etat !== "pause") {
    actualiserEtoiles(delta);
    actualiserParticules(delta);

    if (etat === "jeu") {
      actualiser(delta);
    } else {
      secousse = Math.max(0, secousse - delta);
    }
  }

  dessiner(temps);
  requestAnimationFrame(boucleJeu);
}

/* ===== CLAVIER ===== */

document.addEventListener("keydown", (event) => {
  if (
    event.code === "KeyP" &&
    !event.repeat &&
    (etat === "jeu" || etat === "pause")
  ) {
    event.preventDefault();
    basculerPause();
    return;
  }

  if (etat !== "jeu") return;

  if (commandes[event.code]) {
    event.preventDefault();
    clavier.add(event.code);
  }

  if (event.code === "Space") {
    event.preventDefault();
    espace = true;
  }
});

document.addEventListener("keyup", (event) => {
  clavier.delete(event.code);

  if (event.code === "Space") {
    espace = false;
  }
});

/* ===== COMMANDES TACTILES ===== */

for (const direction of ["haut", "bas", "gauche", "droite"]) {
  const bouton = $(direction);

  bouton.addEventListener("pointerdown", (event) => {
    if (etat !== "jeu") return;

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) return;

    event.preventDefault();

    bouton.setPointerCapture(event.pointerId);
    directionsTactiles.set(event.pointerId, direction);
  });

  const relacher = (event) => {
    directionsTactiles.delete(event.pointerId);
  };

  bouton.addEventListener("pointerup", relacher);
  bouton.addEventListener("pointercancel", relacher);
  bouton.addEventListener("lostpointercapture", relacher);
}

$("bouton-tir").addEventListener("pointerdown", (event) => {
  if (etat !== "jeu") return;

  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) return;

  event.preventDefault();

  $("bouton-tir").setPointerCapture(event.pointerId);
  tirsTactiles.add(event.pointerId);
});

function relacherTir(event) {
  tirsTactiles.delete(event.pointerId);
}

$("bouton-tir").addEventListener("pointerup", relacherTir);
$("bouton-tir").addEventListener("pointercancel", relacherTir);
$("bouton-tir").addEventListener(
  "lostpointercapture",
  relacherTir
);

/* ===== BOUTONS ET PERTE DE FOCUS ===== */

$("bouton-jouer").addEventListener("click", demarrerPartie);
$("bouton-rejouer").addEventListener("click", demarrerPartie);
$("bouton-pause").addEventListener("click", basculerPause);
$("bouton-reprendre").addEventListener("click", basculerPause);

function quitterFenetre() {
  reinitialiserCommandes();

  if (etat === "jeu") basculerPause();
}

window.addEventListener("blur", quitterFenetre);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) quitterFenetre();

  derniereFrame = null;
});

/* Une seule boucle d'animation pour toute l'application. */
actualiserHUD();
requestAnimationFrame(boucleJeu);
/* ===== SONS ARCADE ===== */

let audioJeu = null;
let volumeJeu = null;

function initialiserAudio() {
  try {
    if (!audioJeu) {
      const AudioContextJeu =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextJeu) return;

      audioJeu = new AudioContextJeu();

      volumeJeu = audioJeu.createGain();
      volumeJeu.gain.value = 0.22;
      volumeJeu.connect(audioJeu.destination);
    }

    if (audioJeu.state === "suspended") {
      audioJeu.resume().catch(() => {});
    }
  } catch {
    // Le jeu reste jouable si le son est indisponible.
  }
}

function noteArcade({
  frequence = 440,
  fin = frequence,
  duree = 0.12,
  volume = 0.2,
  type = "sine",
  retard = 0
} = {}) {
  if (!audioJeu || audioJeu.state !== "running") return;

  const debut = audioJeu.currentTime + retard;

  const oscillateur = audioJeu.createOscillator();
  const enveloppe = audioJeu.createGain();

  oscillateur.type = type;

  oscillateur.frequency.setValueAtTime(frequence, debut);

  oscillateur.frequency.exponentialRampToValueAtTime(
    Math.max(20, fin),
    debut + duree
  );

  enveloppe.gain.setValueAtTime(0, debut);
  enveloppe.gain.linearRampToValueAtTime(
    volume,
    debut + 0.005
  );

  enveloppe.gain.exponentialRampToValueAtTime(
    0.001,
    debut + duree
  );

  oscillateur.connect(enveloppe);
  enveloppe.connect(volumeJeu);

  oscillateur.start(debut);
  oscillateur.stop(debut + duree + 0.02);

  oscillateur.onended = () => {
    oscillateur.disconnect();
    enveloppe.disconnect();
  };
}

function bruitExplosion(volume = 0.4, duree = 0.25) {
  if (!audioJeu || audioJeu.state !== "running") return;

  const taille = Math.ceil(audioJeu.sampleRate * duree);
  const tampon = audioJeu.createBuffer(
    1,
    taille,
    audioJeu.sampleRate
  );

  const donnees = tampon.getChannelData(0);

  for (let i = 0; i < taille; i++) {
    donnees[i] = Math.random() * 2 - 1;
  }

  const source = audioJeu.createBufferSource();
  const filtre = audioJeu.createBiquadFilter();
  const enveloppe = audioJeu.createGain();

  const debut = audioJeu.currentTime;

  source.buffer = tampon;

  filtre.type = "lowpass";
  filtre.frequency.setValueAtTime(1800, debut);
  filtre.frequency.exponentialRampToValueAtTime(
    90,
    debut + duree
  );

  enveloppe.gain.setValueAtTime(volume, debut);
  enveloppe.gain.exponentialRampToValueAtTime(
    0.001,
    debut + duree
  );

  source.connect(filtre);
  filtre.connect(enveloppe);
  enveloppe.connect(volumeJeu);

  source.start(debut);
  source.stop(debut + duree);

  source.onended = () => {
    source.disconnect();
    filtre.disconnect();
    enveloppe.disconnect();
  };
}

function sonLaser() {
  noteArcade({
    frequence: 1400,
    fin: 350,
    duree: 0.09,
    volume: 0.12,
    type: "sawtooth"
  });
}

function sonBonus() {
  [660, 880, 1320].forEach((frequence, index) => {
    noteArcade({
      frequence,
      duree: 0.14,
      volume: 0.25,
      type: "triangle",
      retard: index * 0.07
    });
  });
}

function sonDegats() {
  bruitExplosion(0.6, 0.35);

  noteArcade({
    frequence: 180,
    fin: 45,
    duree: 0.35,
    volume: 0.35,
    type: "sawtooth"
  });
}

/* Active le son au clic sur les boutons du jeu. */
$("bouton-jouer").addEventListener(
  "click",
  initialiserAudio,
  { capture: true }
);

$("bouton-rejouer").addEventListener(
  "click",
  initialiserAudio,
  { capture: true }
);

$("bouton-reprendre").addEventListener(
  "click",
  initialiserAudio,
  { capture: true }
);