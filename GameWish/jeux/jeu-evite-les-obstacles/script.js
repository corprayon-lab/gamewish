const $ = (id) => document.getElementById(id);

const jeu = $("jeu");
const ecrans = {
  accueil: $("ecran-accueil"),
  jeu: $("ecran-jeu"),
  fin: $("ecran-fin")
};

const terrain = $("terrain");
const personnage = $("personnage");
const personnageAccueil = $("personnage-accueil");
const obstacle = $("obstacle");
const message = $("message");

const scoreElement = $("score");
const piecesPartieElement = $("pieces-partie");
const piecesAccueilElement = $("pieces-accueil");
const recordAccueilElement = $("record-accueil");
const niveauElement = $("niveau");

const jaugeBonus = $("jauge-bonus");
const jaugeNom = $("jauge-nom");
const jaugeRemplissage = $("jauge-remplissage");

const personnages = {
  cube: { nom: "Cube", prix: 0 },
  robot: { nom: "Robot néon", prix: 15 },
  ninja: { nom: "Ninja", prix: 25 },
  chat: { nom: "Chat cyber", prix: 40 },
  flamme: { nom: "Flamme", prix: 60 },
  vaisseau: { nom: "Vaisseau", prix: 80 }
};

const trails = {
  aucune: { nom: "Aucune", prix: 0, emoji: "🚫" },
  etoiles: { nom: "Étoiles", prix: 10, emoji: "✨" },
  arcenciel: { nom: "Arc-en-ciel", prix: 15, emoji: "🌈" },
  eclairs: { nom: "Éclairs", prix: 20, emoji: "⚡" },
  fumee: { nom: "Fumée", prix: 25, emoji: "💨" }
};

const themes = {
  neon: { nom: "Nuit Néon", prix: 0 },
  desert: { nom: "Désert Solaire", prix: 20 },
  cyber: { nom: "Cyberpunk", prix: 30 },
  espace: { nom: "Espace", prix: 40 }
};

const bonus = {
  aimant: { nom: "Aimant", emoji: "🧲", duree: 7000 },
  bouclier: { nom: "Bouclier", emoji: "🛡️", duree: 10000 },
  multiplicateur: { nom: "Multiplicateur x2", emoji: "✖️", duree: 8000 }
};

let pieces = 0;
let record = 0;
let sonActive = true;

let personnageActif = "cube";
let personnagesDebloques = ["cube"];

let trailActif = "aucune";
let trailsDebloques = ["aucune"];

let themeActif = "neon";
let themesDebloques = ["neon"];

function sauvegarder() {
  try {
    localStorage.setItem(
      "evite-obstacles-save",
      JSON.stringify({
        pieces,
        record,
        sonActive,
        personnageActif,
        personnagesDebloques,
        trailActif,
        trailsDebloques,
        themeActif,
        themesDebloques
      })
    );
  } catch {
    // La sauvegarde reste disponible pour la session en cours.
  }
}

function chargerSauvegarde() {
  try {
    const donnees = JSON.parse(
      localStorage.getItem("evite-obstacles-save")
    );

    if (!donnees || typeof donnees !== "object") return;

    if (Number.isSafeInteger(donnees.pieces) && donnees.pieces >= 0) {
      pieces = donnees.pieces;
    }

    if (Number.isSafeInteger(donnees.record) && donnees.record >= 0) {
      record = donnees.record;
    }

    if (typeof donnees.sonActive === "boolean") {
      sonActive = donnees.sonActive;
    }

    if (
      typeof donnees.personnageActif === "string" &&
      Object.hasOwn(personnages, donnees.personnageActif)
    ) {
      personnageActif = donnees.personnageActif;
    }

    if (Array.isArray(donnees.personnagesDebloques)) {
      personnagesDebloques = donnees.personnagesDebloques.filter((id) =>
        Object.hasOwn(personnages, id)
      );
    }

    if (
      typeof donnees.trailActif === "string" &&
      Object.hasOwn(trails, donnees.trailActif)
    ) {
      trailActif = donnees.trailActif;
    }

    if (Array.isArray(donnees.trailsDebloques)) {
      trailsDebloques = donnees.trailsDebloques.filter((id) =>
        Object.hasOwn(trails, id)
      );
    }

    if (
      typeof donnees.themeActif === "string" &&
      Object.hasOwn(themes, donnees.themeActif)
    ) {
      themeActif = donnees.themeActif;
    }

    if (Array.isArray(donnees.themesDebloques)) {
      themesDebloques = donnees.themesDebloques.filter((id) =>
        Object.hasOwn(themes, id)
      );
    }
  } catch {
    // En cas d’erreur, on garde les valeurs par défaut.
  }

  personnagesDebloques = [...new Set(["cube", ...personnagesDebloques])];
  trailsDebloques = [...new Set(["aucune", ...trailsDebloques])];
  themesDebloques = [...new Set(["neon", ...themesDebloques])];
}

let contexteAudio = null;

function jouerSon(frequence, duree = 0.08) {
  if (!sonActive) return;

  try {
    contexteAudio = contexteAudio || new (window.AudioContext || window.webkitAudioContext)();

    const oscillateur = contexteAudio.createOscillator();
    const gain = contexteAudio.createGain();

    oscillateur.type = "square";
    oscillateur.frequency.value = frequence;
    gain.gain.value = 0.06;

    oscillateur.connect(gain);
    gain.connect(contexteAudio.destination);

    oscillateur.start();
    oscillateur.stop(contexteAudio.currentTime + duree);
  } catch {
    // Le son est désactivé si le navigateur ne le permet pas.
  }
}

function afficherEcran(nom) {
  Object.entries(ecrans).forEach(([cle, ecran]) => {
    const actif = cle === nom;
    ecran.hidden = !actif;
    ecran.classList.toggle("visible", actif);
  });
}

function appliquerPersonnage() {
  const skins = [
    "skin-cube",
    "skin-robot",
    "skin-ninja",
    "skin-chat",
    "skin-flamme",
    "skin-vaisseau"
  ];

  skins.forEach((skin) => {
    personnage.classList.remove(skin);
    personnageAccueil.classList.remove(skin);
  });

  const skin = `skin-${personnageActif}`;

  personnage.classList.add(skin);
  personnageAccueil.classList.add(skin);
}

function actualiserAccueil() {
  piecesAccueilElement.textContent = pieces;
  recordAccueilElement.textContent = record;

  const niveau = 1 + Math.floor(record / 50);
  niveauElement.textContent = `Niveau ${niveau}`;

  appliquerPersonnage();
}

function appliquerTheme() {
  document.body.className = `theme-${themeActif}`;
}

let enJeu = false;
let enPause = false;

let score = 0;
let piecesPartie = 0;

let intervalleJeu = null;
let prochainePiece = 0;
let prochainBonus = 0;

let bonusActif = null;
let finBonus = 0;

let positionY = 45;
let vitesseSaut = 0;
let sautsRestants = 2;

const sol = 45;
const gravite = 1500;
const forcePremierSaut = 560;
const forceSecondSaut = 470;

function demarrerPartie() {
  enJeu = true;
  enPause = false;

  score = 0;
  piecesPartie = 0;
  prochainePiece = 1.4;
  prochainBonus = 8;

  bonusActif = null;
  finBonus = 0;

  positionY = sol;
  vitesseSaut = 0;
  sautsRestants = 2;

  personnage.classList.remove("bouclier");
  personnage.style.setProperty("bottom", `${sol}px`, "important");

  obstacle.classList.remove("bouge");
  obstacle.style.left = "100%";

  terrain.querySelectorAll(".piece, .bonus, .particule").forEach((element) => {
    element.remove();
  });

  scoreElement.textContent = score;
  piecesPartieElement.textContent = piecesPartie;

  jaugeBonus.hidden = true;

  message.textContent =
    "Appuie une fois pour sauter. Appuie deux fois pour faire un double saut.";
  message.classList.remove("perdu");

  afficherEcran("jeu");

  setTimeout(() => {
    if (!enJeu) return;

    changerObstacle();
    obstacle.classList.add("bouge");
  }, 700);

  clearInterval(intervalleJeu);
  intervalleJeu = setInterval(() => {
    if (!enJeu || enPause) return;

    prochainePiece -= 0.05;

    if (prochainePiece <= 0) {
      prochainePiece = 1.2 + Math.random() * 0.8;
      creerPiece();
    }

    prochainBonus -= 0.05;

    if (prochainBonus <= 0) {
      prochainBonus = 8 + Math.random() * 5;
      creerBonus();
    }

    verifierBonus();
    if (
      Math.random() < 0.08 &&
      terrain.querySelectorAll(".nuage, .etoile").length < 3
    ) {
      creerDecor();
}
  }, 50);

  derniereFrame = performance.now();
  requestAnimationFrame(boucleJeu);
}

function mettreEnPause() {
  if (!enJeu) return;

  enPause = !enPause;
  terrain.classList.toggle("pause", enPause);

  $("bouton-pause").textContent = enPause ? "▶️" : "⏸️";
}

function changerObstacle() {
  obstacle.style.left = "100%";

  const types = ["petit", "moyen", "grand"];
  const type = types[Math.floor(Math.random() * types.length)];

  const formes = ["rectangle", "triangle", "rond", "losange"];
  const forme = formes[Math.floor(Math.random() * formes.length)];

  if (type === "petit") {
    obstacle.style.width = "28px";
    obstacle.style.height = "48px";
  }

  if (type === "moyen") {
    obstacle.style.width = "36px";
    obstacle.style.height = "72px";
  }

  if (type === "grand") {
    obstacle.style.width = "42px";
    obstacle.style.height = "96px";
  }

  const vitesseBase = 2.4 + Math.random() * 1.2;
  const vitesse = Math.max(1.3, vitesseBase - score / 400);
  obstacle.style.animationDuration = `${vitesse}s`;

  obstacle.classList.remove(
    "obstacle-rectangle",
    "obstacle-triangle",
    "obstacle-rond",
    "obstacle-losange"
  );
  obstacle.classList.add("obstacle-" + forme);

  obstacle.classList.remove("bouge");
  void obstacle.offsetWidth;
  obstacle.classList.add("bouge");
}

obstacle.addEventListener("animationiteration", changerObstacle);

let derniereFrame = 0;

function mettreAJourCiel() {
  const progression = Math.min(1, score / 150);

  const matin = [56, 189, 248];
  const midi = [250, 204, 21];
  const soir = [30, 41, 59];

  let r, g, b;

  if (progression < 0.5) {
    const t = progression / 0.5;
    r = Math.round(matin[0] + (midi[0] - matin[0]) * t);
    g = Math.round(matin[1] + (midi[1] - matin[1]) * t);
    b = Math.round(matin[2] + (midi[2] - matin[2]) * t);
  } else {
    const t = (progression - 0.5) / 0.5;
    r = Math.round(midi[0] + (soir[0] - midi[0]) * t);
    g = Math.round(midi[1] + (soir[1] - midi[1]) * t);
    b = Math.round(midi[2] + (soir[2] - midi[2]) * t);
  }

  terrain.style.background = `linear-gradient(180deg, rgb(${r}, ${g}, ${b}), #0f172a)`;
}

function boucleJeu(temps) {
  if (!enJeu) return;

  if (enPause) {
    derniereFrame = temps;
    requestAnimationFrame(boucleJeu);
    return;
  }

  const delta = Math.min(0.05, (temps - derniereFrame) / 1000);
  derniereFrame = temps;

  if (positionY > sol || vitesseSaut > 0) {
    positionY += vitesseSaut * delta;
    vitesseSaut -= gravite * delta;

    if (positionY <= sol) {
      positionY = sol;
      vitesseSaut = 0;
      sautsRestants = 2;
    }

    personnage.style.setProperty("bottom", `${positionY}px`, "important");
  }

  score += delta * 2;
  mettreAJourCiel();

  if (Number.isInteger(score)) {
    scoreElement.textContent = Math.floor(score);
  }

  verifierCollisions();
  requestAnimationFrame(boucleJeu);
}

function creerDecor() {
  const estNuage = Math.random() < 0.5;

  const element = document.createElement("div");
  element.className = estNuage ? "nuage" : "etoile";
  element.textContent = estNuage ? "☁️" : "✨";

  element.style.top = `${20 + Math.random() * 160}px`;
  element.style.animationDuration = `${14 + Math.random() * 8}s`;

  element.addEventListener("animationend", () => element.remove());
  terrain.appendChild(element);
}

function creerPiece() {
  const piece = document.createElement("div");
  piece.className = "piece";
  piece.textContent = "🪙";

  piece.style.top = `${280 + Math.random() * 80}px`;
  piece.style.animationDuration = `${1.8 + Math.random() * 0.8}s`;

  piece.addEventListener("animationend", () => piece.remove());
  terrain.appendChild(piece);
}

function creerBonus() {
  const types = Object.keys(bonus);
  const type = types[Math.floor(Math.random() * types.length)];

  const element = document.createElement("div");
  element.className = "bonus";
  element.dataset.type = type;
  element.textContent = bonus[type].emoji;

  element.style.top = `${280 + Math.random() * 80}px`;
  element.style.animationDuration = `${2.4 + Math.random() * 0.8}s`;

  element.addEventListener("animationend", () => element.remove());
  terrain.appendChild(element);
}

function activerBonus(type) {
  bonusActif = type;
  finBonus = performance.now() + bonus[type].duree;

  jaugeBonus.hidden = false;
  jaugeNom.textContent = bonus[type].nom;

  if (type === "bouclier") {
    personnage.classList.add("bouclier");
  }

  jouerSon(700, 0.12);
}

function verifierBonus() {
  if (!bonusActif) return;

  const maintenant = performance.now();
  const restant = finBonus - maintenant;

  if (restant <= 0) {
    bonusActif = null;
    jaugeBonus.hidden = true;

    if (personnage.classList.contains("bouclier")) {
      personnage.classList.remove("bouclier");
    }

    return;
  }

  const pourcentage = (restant / bonus[bonusActif].duree) * 100;
  jaugeRemplissage.style.width = `${pourcentage}%`;
}

function multiplicateurActif() {
  return bonusActif === "multiplicateur";
}

function verifierCollisions() {
  const rectPersonnage = personnage.getBoundingClientRect();

  terrain.querySelectorAll(".piece, .bonus").forEach((element) => {
    const rectElement = element.getBoundingClientRect();

    let marge = 0;

    if (element.classList.contains("piece") && bonusActif === "aimant") {
      marge = 65;
    }

    const collision =
      rectPersonnage.right + marge > rectElement.left &&
      rectPersonnage.left - marge < rectElement.right &&
      rectPersonnage.bottom > rectElement.top &&
      rectPersonnage.top < rectElement.bottom;

    if (!collision) return;

    if (element.classList.contains("piece")) {
      const gainPiece = multiplicateurActif() ? 2 : 1;
      const gainScore = multiplicateurActif() ? 10 : 5;

      piecesPartie += gainPiece;
      score += gainScore;

      piecesPartieElement.textContent = piecesPartie;
      scoreElement.textContent = Math.floor(score);

      jouerSon(900, 0.06);
      element.remove();
      return;
    }

    activerBonus(element.dataset.type);
    element.remove();
  });

  const rectObstacle = obstacle.getBoundingClientRect();

  const collisionObstacle =
    rectPersonnage.right > rectObstacle.left &&
    rectPersonnage.left < rectObstacle.right &&
    rectPersonnage.bottom > rectObstacle.top &&
    rectPersonnage.top < rectObstacle.bottom;

  if (!collisionObstacle) return;

  if (bonusActif === "bouclier") {
    bonusActif = null;
    finBonus = 0;
    jaugeBonus.hidden = true;

    personnage.classList.remove("bouclier");

    obstacle.classList.remove("bouge");
    void obstacle.offsetWidth;
    obstacle.classList.add("bouge");

    jouerSon(300, 0.15);
    return;
  }

  perdrePartie();
}

function perdrePartie() {
  if (!enJeu) return;

  enJeu = false;
  clearInterval(intervalleJeu);

  obstacle.classList.remove("bouge");
  terrain.classList.remove("pause");

  jeu.classList.add("tremble");

  setTimeout(() => {
    jeu.classList.remove("tremble");
  }, 450);

  const nouveauRecord = Math.floor(score) > record;

  if (nouveauRecord) {
    record = Math.floor(score);
  }

  pieces += piecesPartie;

  $("score-fin").textContent = Math.floor(score);
  $("record-fin").textContent = record;
  $("pieces-fin").textContent = piecesPartie;

  $("badge-record").hidden = !nouveauRecord;

  message.textContent = `Perdu ! Ton score est de ${Math.floor(score)}.`;
  message.classList.add("perdu");

  sauvegarder();
  actualiserAccueil();

  setTimeout(() => {
    afficherEcran("fin");
  }, 550);
}

function sauter() {
  if (!enJeu || enPause || sautsRestants <= 0) {
    return;
  }

  if (sautsRestants === 2) {
    vitesseSaut = forcePremierSaut;
  } else {
    vitesseSaut = forceSecondSaut;
  }

  sautsRestants--;
  jouerSon(sautsRestants === 1 ? 500 : 750, 0.08);

  if (trailActif !== "aucune") {
    const symbole = trails[trailActif].emoji;

    for (let i = 0; i < 5; i++) {
      const particule = document.createElement("span");
      particule.className = "particule";
      particule.textContent = symbole;

      particule.style.left = `${100 + Math.random() * 25}px`;
      particule.style.bottom = `${positionY + Math.random() * 25}px`;

      terrain.appendChild(particule);

      setTimeout(() => particule.remove(), 700);
    }
  }
}

function afficherPersonnages() {
  const liste = $("liste-personnages");
  liste.replaceChildren();

  Object.entries(personnages).forEach(([id, donnees]) => {
    const possede = personnagesDebloques.includes(id);
    const actif = personnageActif === id;

    const carte = document.createElement("article");
    carte.className = "carte-objet";
    carte.classList.toggle("actif", actif);

    const apercu = document.createElement("div");
    apercu.className = `apercu skin-${id}`;

    const nom = document.createElement("h4");
    nom.textContent = donnees.nom;

    const prix = document.createElement("p");
    prix.className = "prix";
    prix.textContent = actif
      ? "Actif"
      : possede
        ? "Débloqué"
        : `${donnees.prix} pièces`;

    const bouton = document.createElement("button");
    bouton.textContent = actif ? "Sélectionné" : possede ? "Utiliser" : "Débloquer";
    bouton.disabled = actif;

    bouton.addEventListener("click", () => choisirPersonnage(id));

    carte.append(apercu, nom, prix, bouton);
    liste.appendChild(carte);
  });

  afficherTrails();
}

function afficherTrails() {
  const liste = $("liste-trails");
  liste.replaceChildren();

  Object.entries(trails).forEach(([id, donnees]) => {
    const possede = trailsDebloques.includes(id);
    const actif = trailActif === id;

    const carte = document.createElement("article");
    carte.className = "carte-objet";
    carte.classList.toggle("actif", actif);

    const apercu = document.createElement("div");
    apercu.className = "apercu";
    apercu.textContent = donnees.emoji;

    const nom = document.createElement("h4");
    nom.textContent = donnees.nom;

    const prix = document.createElement("p");
    prix.className = "prix";
    prix.textContent = actif ? "Active" : possede ? "Débloquée" : `${donnees.prix} pièces`;

    const bouton = document.createElement("button");
    bouton.textContent = actif ? "Sélectionnée" : possede ? "Utiliser" : "Débloquer";
    bouton.disabled = actif;

    bouton.addEventListener("click", () => choisirTrail(id));

    carte.append(apercu, nom, prix, bouton);
    liste.appendChild(carte);
  });
}

function afficherThemes() {
  const liste = $("liste-themes");
  liste.replaceChildren();

  Object.entries(themes).forEach(([id, donnees]) => {
    const possede = themesDebloques.includes(id);
    const actif = themeActif === id;

    const carte = document.createElement("article");
    carte.className = "carte-objet";
    carte.classList.toggle("actif", actif);

    const apercu = document.createElement("div");
    apercu.className = "apercu";
    apercu.textContent = "🌍";

    const nom = document.createElement("h4");
    nom.textContent = donnees.nom;

    const prix = document.createElement("p");
    prix.className = "prix";
    prix.textContent = actif ? "Actif" : possede ? "Débloqué" : `${donnees.prix} pièces`;

    const bouton = document.createElement("button");
    bouton.textContent = actif ? "Sélectionné" : possede ? "Utiliser" : "Débloquer";
    bouton.disabled = actif;

    bouton.addEventListener("click", () => choisirTheme(id));

    carte.append(apercu, nom, prix, bouton);
    liste.appendChild(carte);
  });
}

function acheter(id, prix, debloques, messageElement) {
  if (debloques.includes(id)) return true;

  if (pieces < prix) {
    messageElement.textContent =
      `Il te manque ${prix - pieces} pièce(s).`;
    return false;
  }

  pieces -= prix;
  debloques.push(id);

  actualiserAccueil();
  sauvegarder();

  return true;
}

function choisirPersonnage(id) {
  const donnees = personnages[id];
  const possede = personnagesDebloques.includes(id);

  if (!possede) {
    const achete = acheter(
      id,
      donnees.prix,
      personnagesDebloques,
      $("message-boutique")
    );

    if (!achete) return;
  }

  personnageActif = id;

  $("message-boutique").textContent = `Personnage ${donnees.nom} sélectionné !`;

  appliquerPersonnage();
  sauvegarder();
  afficherPersonnages();
}

function choisirTrail(id) {
  const donnees = trails[id];
  const possede = trailsDebloques.includes(id);

  if (!possede) {
    const achete = acheter(
      id,
      donnees.prix,
      trailsDebloques,
      $("message-boutique")
    );

    if (!achete) return;
  }

  trailActif = id;

  $("message-boutique").textContent = `Traînée ${donnees.nom} sélectionnée !`;

  sauvegarder();
  afficherPersonnages();
}

function choisirTheme(id) {
  const donnees = themes[id];
  const possede = themesDebloques.includes(id);

  if (!possede) {
    const achete = acheter(
      id,
      donnees.prix,
      themesDebloques,
      $("message-themes")
    );

    if (!achete) return;
  }

  themeActif = id;
  appliquerTheme();

  $("message-themes").textContent = `Thème ${donnees.nom} sélectionné !`;

  sauvegarder();
  afficherThemes();
}

$("bouton-jouer").addEventListener("click", () => {
  jouerSon(600, 0.1);
  demarrerPartie();
});

$("bouton-pause").addEventListener("click", mettreEnPause);

$("bouton-accueil").addEventListener("click", () => {
  afficherEcran("accueil");
  actualiserAccueil();
});

$("bouton-rejouer").addEventListener("click", demarrerPartie);

$("bouton-parametres").addEventListener("click", () => {
  $("bascule-son").checked = sonActive;
  $("fenetre-parametres").showModal();
});

$("fermer-parametres").addEventListener("click", () => {
  sonActive = $("bascule-son").checked;
  sauvegarder();
  $("fenetre-parametres").close();
});

$("bouton-personnages").addEventListener("click", () => {
  afficherPersonnages();
  $("fenetre-personnages").showModal();
});

$("fermer-personnages").addEventListener("click", () => {
  $("fenetre-personnages").close();
});

$("bouton-themes").addEventListener("click", () => {
  afficherThemes();
  $("fenetre-themes").showModal();
});

$("fermer-themes").addEventListener("click", () => {
  $("fenetre-themes").close();
});

$("bouton-defis").addEventListener("click", () => {
  $("fenetre-defis").showModal();
});

$("fermer-defis").addEventListener("click", () => {
  $("fenetre-defis").close();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    sauter();
  }

  if (event.code === "Escape" && enJeu) {
    mettreEnPause();
  }
});

terrain.addEventListener("click", sauter);

chargerSauvegarde();
appliquerTheme();
actualiserAccueil();
afficherEcran("accueil");