const $ = (id) => document.getElementById(id);


// ÉCRANS ET ÉLÉMENTS


const ecrans = {
  accueil: $("ecran-accueil"),
  jeu: $("ecran-jeu"),
  victoire: $("ecran-victoire")
};


const grille = $("grille-cartes");
const message = $("message-jeu");
const boutonsMode = document.querySelectorAll(".bouton-mode");


const tempsLimite = 60;
const dureeMemorisation = 4000;


// PIÈCES


let pieces = 0;


function lirePiecesSauvegardees() {
  try {
    const valeur = localStorage.getItem("memory-pieces");
    const nombre = Number(valeur);


    if (valeur === null || valeur === "") {
      return 0;
    }


    if (Number.isSafeInteger(nombre) && nombre >= 0) {
      return nombre;
    }


    localStorage.removeItem("memory-pieces");
    return 0;
  } catch {
    return 0;
  }
}


pieces = lirePiecesSauvegardees();


function actualiserPieces() {
  const compteur = $("compteur-pieces");


  if (compteur) {
    compteur.textContent = String(pieces);
  }
}


function ajouterPieces(montant) {
  const montantValide = Number(montant);


  if (!Number.isFinite(montantValide)) {
    return;
  }


  pieces = Math.max(0, pieces + Math.floor(montantValide));
  actualiserPieces();


  try {
    localStorage.setItem("memory-pieces", String(pieces));
  } catch {
    // Le solde reste disponible pour la session en cours.
  }
}


// THÈMES


const themesDisponibles = {
  espace: {
    nom: "Espace",
    prix: 0,
    symboles: ["🚀", "🌙", "⭐", "🪐", "☄️", "👽", "🛸", "🌍"]
  },


  animaux: {
    nom: "Animaux",
    prix: 10,
    symboles: ["🐱", "🐶", "🦊", "🐼", "🐸", "🦁", "🐵", "🐧"]
  },


  retro: {
    nom: "Rétro",
    prix: 15,
    symboles: ["🕹️", "👾", "📼", "📺", "📻", "💾", "☎️", "🎮"]
  },


  cyber: {
    nom: "Cyber",
    prix: 20,
    symboles: ["🤖", "💻", "⚡", "🔋", "🛰️", "🧬", "🔐", "💿"]
  }
};


let themesDebloques = ["espace"];
let themeSelectionne = "espace";
const symboles = [...themesDisponibles.espace.symboles];


function sauvegarderThemes() {
  try {
    localStorage.setItem(
      "memory-boutique",
      JSON.stringify({
        debloques: themesDebloques,
        selectionne: themeSelectionne
      })
    );


    return true;
  } catch {
    return false;
  }
}


function chargerThemes() {
  try {
    const sauvegarde = JSON.parse(
      localStorage.getItem("memory-boutique")
    );


    if (!sauvegarde || typeof sauvegarde !== "object") return;


    if (Array.isArray(sauvegarde.debloques)) {
      const themesValides = sauvegarde.debloques.filter((id) =>
        Object.hasOwn(themesDisponibles, id)
      );


      themesDebloques = [...new Set(["espace", ...themesValides])];
    }


    if (themesDebloques.includes(sauvegarde.selectionne)) {
      themeSelectionne = sauvegarde.selectionne;
    }
  } catch {
    themesDebloques = ["espace"];
    themeSelectionne = "espace";
  }
}


function appliquerTheme() {
  symboles.splice(
    0,
    symboles.length,
    ...themesDisponibles[themeSelectionne].symboles
  );
}


// ÉTAT DE LA PARTIE


let modeActuel = "classique";
let premiereCarte = null;
let verrouille = false;
let partieTerminee = true;


let coups = 0;
let paires = 0;
let debutPartie = null;
let tempsFinal = 0;


let intervalleChrono = null;
let numeroPartie = 0;


// OUTILS


function afficherEcran(nom) {
  Object.entries(ecrans).forEach(([cle, ecran]) => {
    const actif = cle === nom;
    ecran.hidden = !actif;
    ecran.classList.toggle("visible", actif);
  });
}


function afficherMessage(texte, succes = false) {
  message.textContent = texte;
  message.classList.toggle("succes", succes);
}


function attendre(duree) {
  return new Promise((resolve) => setTimeout(resolve, duree));
}


function melanger(elements) {
  const copie = [...elements];


  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }


  return copie;
}


function formaterTemps(secondes) {
  const valeur = Math.max(0, Math.floor(secondes));
  const minutes = Math.floor(valeur / 60);
  const reste = valeur % 60;


  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(reste).padStart(2, "0")
  );
}


function tempsEcoule() {
  if (debutPartie === null) return 0;


  return (performance.now() - debutPartie) / 1000;
}


function actualiserStatistiques() {
  $("compteur-paires").textContent = `${paires} / ${symboles.length}`;
  $("compteur-coups").textContent = coups;
}


// CHRONOMÈTRE


function actualiserChronometre() {
  const secondes = tempsEcoule();


  if (modeActuel === "chronometre") {
    const restant = Math.max(0, Math.ceil(tempsLimite - secondes));


    $("chronometre").textContent = formaterTemps(restant);


    if (secondes >= tempsLimite) {
      perdrePartie();
    }
  } else {
    $("chronometre").textContent = formaterTemps(secondes);
  }
}


function demarrerChronometre() {
  if (debutPartie !== null || partieTerminee) return;


  debutPartie = performance.now();


  clearInterval(intervalleChrono);
  actualiserChronometre();


  intervalleChrono = setInterval(actualiserChronometre, 100);
}


function perdrePartie() {
  if (partieTerminee) return;


  partieTerminee = true;
  verrouille = true;
  numeroPartie++;


  clearInterval(intervalleChrono);


  $("chronometre").textContent = "00:00";


  afficherMessage(
    "Temps écoulé ! Clique sur « Retour au menu » pour réessayer."
  );
}


// CARTES


function montrerCarte(carte) {
  carte.classList.add("retournee");


  carte.setAttribute(
    "aria-label",
    `Carte ${carte.dataset.position} : ${carte.dataset.symbole}`
  );
}


function cacherCarte(carte) {
  carte.classList.remove("retournee");


  carte.setAttribute(
    "aria-label",
    `Carte ${carte.dataset.position}, face cachée`
  );
}


function creerCarte(symbole, index) {
  const carte = document.createElement("button");


  carte.type = "button";
  carte.className = "carte";
  carte.dataset.symbole = symbole;
  carte.dataset.position = index + 1;


  carte.setAttribute(
    "aria-label",
    `Carte ${index + 1}, face cachée`
  );


  carte.innerHTML = `
    <span class="carte-interieur" aria-hidden="true">
      <span class="carte-face carte-dos">?</span>
      <span class="carte-face carte-devant">
        <span class="symbole">${symbole}</span>
      </span>
    </span>
  `;


  carte.addEventListener("click", () => retournerCarte(carte));


  return carte;
}


// NOUVELLE PARTIE


async function demarrerPartie() {
  joueurActuel = 1;
  scoresJoueurs = [0, 0];


  tableauJoueurs.hidden = modeActuel !== "deux-joueurs";


  if (modeActuel === "deux-joueurs") {
    afficherScoresJoueurs();
  }


  numeroPartie++;
  const partieActuelle = numeroPartie;


  clearInterval(intervalleChrono);


  premiereCarte = null;
  verrouille = false;
  partieTerminee = false;


  coups = 0;
  paires = 0;
  debutPartie = null;
  tempsFinal = 0;


  $("confettis").replaceChildren();


  $("chronometre").textContent =
    modeActuel === "chronometre" ? "01:00" : "00:00";


  actualiserStatistiques();
  grille.replaceChildren();


  const paquet = melanger([...symboles, ...symboles]);


  paquet.forEach((symbole, index) => {
    grille.appendChild(creerCarte(symbole, index));
  });


  afficherEcran("jeu");


  if (modeActuel === "inverse") {
    verrouille = true;
    afficherMessage("Mémorise les cartes pendant 4 secondes…");


    await attendre(100);
    if (partieActuelle !== numeroPartie) return;


    const cartes = [...grille.children];
    cartes.forEach(montrerCarte);


    await attendre(dureeMemorisation);
    if (partieActuelle !== numeroPartie) return;


    cartes.forEach(cacherCarte);


    await attendre(500);
    if (partieActuelle !== numeroPartie) return;


    verrouille = false;
    afficherMessage("À toi de retrouver les paires !");
    demarrerChronometre();


  } else if (modeActuel === "chronometre") {
    afficherMessage("Tu as 60 secondes pour trouver les 8 paires !");
    demarrerChronometre();


  } else {
    afficherMessage("Retourne une première carte.");
  }
}


// COMPARAISON DES CARTES


async function retournerCarte(carte) {
  if (
    verrouille ||
    partieTerminee ||
    carte.classList.contains("trouvee") ||
    carte.classList.contains("retournee")
  ) {
    return;
  }


  if (
    modeActuel === "chronometre" &&
    debutPartie !== null &&
    tempsEcoule() >= tempsLimite
  ) {
    perdrePartie();
    return;
  }


  demarrerChronometre();
  montrerCarte(carte);


  if (premiereCarte === null) {
    premiereCarte = carte;
    afficherMessage("Choisis une deuxième carte.");
    return;
  }


  verrouille = true;
  coups++;
  actualiserStatistiques();


  const partieActuelle = numeroPartie;
  const carteA = premiereCarte;
  const carteB = carte;


  const identiques =
    carteA.dataset.symbole === carteB.dataset.symbole;


  if (identiques) {
    if (modeActuel === "deux-joueurs") {
      scoresJoueurs[joueurActuel - 1]++;
      afficherScoresJoueurs();
    }


    paires++;
    actualiserStatistiques();


    [carteA, carteB].forEach((carteTrouvee) => {
      carteTrouvee.classList.add("trouvee");
      carteTrouvee.disabled = true;


      carteTrouvee.setAttribute(
        "aria-label",
        `Paire trouvée : ${carteTrouvee.dataset.symbole}`
      );
    });


    premiereCarte = null;


    if (paires === symboles.length) {
      tempsFinal = Math.floor(tempsEcoule());
      partieTerminee = true;


      clearInterval(intervalleChrono);


      if (modeActuel !== "chronometre") {
        $("chronometre").textContent = formaterTemps(tempsFinal);
      }


      afficherMessage("Toutes les paires sont trouvées !", true);


      await attendre(900);
      if (partieActuelle !== numeroPartie) return;


      terminerPartie();
      return;
    }


    afficherMessage("Bien vu ! Une paire de trouvée.", true);


    await attendre(450);
    if (partieActuelle !== numeroPartie) return;


    verrouille = false;
    return;
  }


  afficherMessage("Mémorise leur position…");


  await attendre(1200);
  if (partieActuelle !== numeroPartie) return;


  cacherCarte(carteA);
  cacherCarte(carteB);


  await attendre(500);
  if (partieActuelle !== numeroPartie) return;


  premiereCarte = null;
  verrouille = false;


  if (modeActuel === "deux-joueurs") {
    joueurActuel = joueurActuel === 1 ? 2 : 1;
    afficherScoresJoueurs();
  }


  afficherMessage("À toi de retrouver une paire !");
}


// VICTOIRE ET MENU


function terminerPartie() {
  const recompenses = {
    classique: 2,
    chronometre: 3,
    inverse: 3
  };


  let messageGagnant = "Bravo, tu as trouvé toutes les paires !";


  if (modeActuel === "deux-joueurs") {
    if (scoresJoueurs[0] > scoresJoueurs[1]) {
      messageGagnant = "Le joueur 1 a gagné !";
    } else if (scoresJoueurs[1] > scoresJoueurs[0]) {
      messageGagnant = "Le joueur 2 a gagné !";
    } else {
      messageGagnant = "Égalité parfaite !";
    }
  } else {
    ajouterPieces(recompenses[modeActuel]);
  }


  let texteGagnant = $("message-gagnant");


  if (!texteGagnant) {
    texteGagnant = document.createElement("h2");
    texteGagnant.id = "message-gagnant";
    texteGagnant.style.margin = "10px 0 18px";
    texteGagnant.style.color = "#fcd34d";
    texteGagnant.style.fontSize = "28px";
    texteGagnant.style.textAlign = "center";


    const ecranVictoire = $("ecran-victoire");
    ecranVictoire.insertBefore(texteGagnant, ecranVictoire.firstChild);
  }


  texteGagnant.textContent = messageGagnant;


  $("coups-fin").textContent = coups;
  $("temps-fin").textContent = formaterTemps(tempsFinal);


  afficherEcran("victoire");
  lancerConfettis();
}


function retourAuMenu() {
  numeroPartie++;
  clearInterval(intervalleChrono);


  partieTerminee = true;
  verrouille = true;
  premiereCarte = null;


  $("confettis").replaceChildren();
  afficherEcran("accueil");
}


function lancerConfettis() {
  const couleurs = ["#a78bfa", "#67e8f9", "#6ee7b7", "#fcd34d"];
  const zone = $("confettis");


  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement("div");


    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * 100}%`;


    confetti.style.background =
      couleurs[Math.floor(Math.random() * couleurs.length)];


    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.borderRadius =
      Math.random() > 0.5 ? "50%" : "2px";


    zone.appendChild(confetti);


    setTimeout(() => confetti.remove(), 3800);
  }
}


// BOUTIQUE


const fenetreBoutique = $("fenetre-boutique");
const listeThemes = $("liste-themes");
const messageBoutique = $("message-boutique");


function afficherThemes() {
  listeThemes.replaceChildren();


  Object.entries(themesDisponibles).forEach(([id, theme]) => {
    const possede = themesDebloques.includes(id);
    const selectionne = themeSelectionne === id;


    const carteTheme = document.createElement("article");
    carteTheme.className = "theme-boutique";
    carteTheme.classList.toggle("selectionne", selectionne);


    const titre = document.createElement("h3");
    titre.textContent = theme.nom;


    const apercu = document.createElement("div");
    apercu.className = "apercu-theme";
    apercu.textContent = theme.symboles.slice(0, 3).join(" ");
    apercu.setAttribute("aria-hidden", "true");


    const prix = document.createElement("p");
    prix.className = "prix-theme";


    if (selectionne) {
      prix.textContent = "Thème actif";
    } else if (possede) {
      prix.textContent = "Déjà débloqué";
    } else {
      prix.textContent = `${theme.prix} pièces`;
    }


    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "bouton-theme";
    bouton.disabled = selectionne;


    bouton.textContent = selectionne
      ? "Sélectionné"
      : possede
        ? "Utiliser"
        : "Débloquer";


    bouton.addEventListener("click", () => choisirTheme(id));


    carteTheme.append(titre, apercu, prix, bouton);
    listeThemes.appendChild(carteTheme);
  });
}


function choisirTheme(id) {
  const theme = themesDisponibles[id];
  const possede = themesDebloques.includes(id);


  if (!possede) {
    if (pieces < theme.prix) {
      const manque = theme.prix - pieces;


      messageBoutique.textContent =
        `Il te manque ${manque} pièce${manque > 1 ? "s" : ""} ` +
        `pour débloquer le thème ${theme.nom}.`;


      return;
    }


    const confirmation = window.confirm(
      `Débloquer le thème ${theme.nom} pour ${theme.prix} pièces ?`
    );


    if (!confirmation) return;


    ajouterPieces(-theme.prix);
    themesDebloques.push(id);
  }


  themeSelectionne = id;
  appliquerTheme();


  const sauvegardeReussie = sauvegarderThemes();


  afficherThemes();


  messageBoutique.textContent = possede
    ? `Thème ${theme.nom} sélectionné !`
    : `Thème ${theme.nom} débloqué et sélectionné !`;


  if (!sauvegardeReussie) {
    messageBoutique.textContent +=
      " Attention : la sauvegarde est indisponible dans ce navigateur.";
  }
}


// BOUTONS


boutonsMode.forEach((bouton) => {
  bouton.addEventListener("click", () => {
    boutonsMode.forEach((autreBouton) => {
      autreBouton.classList.remove("actif");
    });


    bouton.classList.add("actif");
    modeActuel = bouton.dataset.mode;
  });
});


$("bouton-demarrer").addEventListener("click", demarrerPartie);


$("bouton-recommencer").textContent = "Retour au menu";
$("bouton-recommencer").addEventListener("click", retourAuMenu);


$("bouton-rejouer").textContent = "Retour au menu";
$("bouton-rejouer").addEventListener("click", retourAuMenu);


$("bouton-boutique").addEventListener("click", () => {
  messageBoutique.textContent = `Ton solde : ${pieces} pièces.`;
  afficherThemes();


  if (!fenetreBoutique.open) {
    fenetreBoutique.showModal();
  }
});


$("fermer-boutique").addEventListener("click", () => {
  fenetreBoutique.close();
});


// INITIALISATION


chargerThemes();
appliquerTheme();
actualiserPieces();
afficherEcran("accueil");


// MODE 2 JOUEURS


const boutonDeuxJoueurs = document.createElement("button");


boutonDeuxJoueurs.type = "button";
boutonDeuxJoueurs.className = "bouton-mode";
boutonDeuxJoueurs.dataset.mode = "deux-joueurs";
boutonDeuxJoueurs.textContent = "2 joueurs";


document.querySelector(".choix-modes").appendChild(boutonDeuxJoueurs);


boutonDeuxJoueurs.addEventListener("click", () => {
  document.querySelectorAll(".bouton-mode").forEach((bouton) => {
    bouton.classList.remove("actif");
  });


  boutonDeuxJoueurs.classList.add("actif");
  modeActuel = "deux-joueurs";
});


// Scores et tour du mode 2 joueurs.


let joueurActuel = 1;
let scoresJoueurs = [0, 0];


const tableauJoueurs = document.createElement("div");


tableauJoueurs.id = "tableau-joueurs";
tableauJoueurs.hidden = true;


tableauJoueurs.style.cssText = `
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid rgba(167, 139, 250, 0.4);
  border-radius: 16px;
  background: rgba(167, 139, 250, 0.1);
  text-align: center;
  line-height: 1.8;
`;


document.querySelector(".entete-jeu").appendChild(tableauJoueurs);


function afficherScoresJoueurs() {
  tableauJoueurs.replaceChildren();


  const scores = document.createElement("div");
  scores.textContent =
    `Joueur 1 : ${scoresJoueurs[0]} point(s) — ` +
    `Joueur 2 : ${scoresJoueurs[1]} point(s)`;


  const tour = document.createElement("div");
  tour.textContent = `Au tour du joueur ${joueurActuel}`;
  tour.style.color = joueurActuel === 1 ? "#67e8f9" : "#f0abfc";
  tour.style.fontWeight = "700";


  tableauJoueurs.append(scores, tour);
}