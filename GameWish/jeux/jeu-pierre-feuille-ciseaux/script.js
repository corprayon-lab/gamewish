const $ = (id) => document.getElementById(id);

const ecrans = {
  accueil: $("ecran-demarrage"),
  jeu: $("ecran-jeu"),
  fin: $("ecran-fin")
};

const boutons = [...document.querySelectorAll(".choix")];
const zoneBoutons = document.querySelector(".boutons");

const mainJoueur = $("main-joueur");
const mainOrdinateur = $("main-ordinateur");
const arene = $("arene");
const message = $("message");
const compte = $("compte");
const progression = $("progression");
const barreTemps = $("barre-temps");
const consigne = $("consigne");

const choixPossibles = ["pierre", "feuille", "ciseaux"];
const dureeChoix = 5000;
const objectif = 3;

let scoreJoueur = 0;
let scoreOrdinateur = 0;
let manche = 1;
let phase = "accueil";
let choixAdversaire = null;
let finChoix = 0;
let animationChrono = null;
let versionMatch = 0;

const formes = {
  pierre: `
    <path d="
      M43 83
      L36 62
      Q33 53 40 48
      Q45 45 50 51
      L53 56
      L53 34
      Q53 25 61 25
      Q69 25 69 34
      L69 29
      Q69 20 77 20
      Q85 20 85 29
      L85 32
      Q85 24 93 24
      Q101 24 101 32
      L101 39
      Q101 32 108 32
      Q116 32 116 41
      L116 68
      Q116 85 104 93
      L104 108
      L59 108
      L59 96
      Q48 93 43 83 Z
    "/>
    <path d="M69 37 L69 57 M85 36 L85 57 M101 42 L101 59"/>
    <path d="M51 58 Q70 54 77 67 Q81 76 72 82"/>
  `,

  feuille: `
    <path d="
      M48 84
      L29 62
      Q23 54 29 49
      Q35 44 42 51
      L53 62
      L48 27
      Q47 18 54 17
      Q62 16 63 25
      L68 52
      L68 15
      Q68 7 76 7
      Q84 7 84 15
      L84 50
      L89 21
      Q90 13 97 14
      Q105 15 103 24
      L99 55
      L106 35
      Q109 28 116 31
      Q122 34 119 42
      L111 76
      Q107 88 98 94
      L98 110
      L60 110
      L60 97
      Q53 93 48 84 Z
    "/>
    <path d="M66 72 Q78 62 96 69"/>
  `,

  ciseaux: `
    <path d="
      M49 84
      L41 68
      Q37 59 44 55
      Q50 52 56 59
      L60 65
      L48 24
      Q46 16 53 13
      Q61 10 64 19
      L77 54
      L88 18
      Q91 9 99 12
      Q106 15 103 23
      L92 59
      Q99 52 106 57
      Q111 61 109 68
      Q116 66 119 74
      Q122 85 107 95
      L107 110
      L62 110
      L62 97
      Q53 93 49 84 Z
    "/>
    <path d="M62 66 Q77 59 84 71 Q88 80 79 85"/>
    <path d="M92 61 L88 76 M108 69 L100 82"/>
  `
};

function dessinerMain(choix, identifiant, adversaire = false) {
  return `
    <svg
      viewBox="0 0 150 125"
      role="img"
      aria-label="${choix}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="${identifiant}"
          x1="0" y1="0" x2="1" y2="1"
        >
          <stop offset="0%" stop-color="#ffe0b6"/>
          <stop offset="55%" stop-color="#edb17e"/>
          <stop offset="100%" stop-color="#c67a53"/>
        </linearGradient>
      </defs>

      <g
        transform="${adversaire ? "translate(150 0) scale(-1 1)" : ""}"
        fill="url(#${identifiant})"
        stroke="#6f3d32"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        ${formes[choix]}
      </g>
    </svg>
  `;
}

function afficherMains(joueur = "pierre", ordinateur = "pierre") {
  mainJoueur.innerHTML = dessinerMain(joueur, "peau-joueur");
  mainOrdinateur.innerHTML = dessinerMain(
    ordinateur,
    "peau-ordinateur",
    true
  );
}

boutons.forEach((bouton) => {
  const choix = bouton.dataset.choix;

  bouton.querySelector(".icone-choix").innerHTML =
    dessinerMain(choix, `icone-${choix}`);

  bouton.addEventListener("click", () => {
    if (phase !== "choix") return;

    if (performance.now() >= finChoix) {
      terminerChoix(null);
      return;
    }

    bouton.classList.add("selectionne");
    terminerChoix(choix);
  });
});

$("bouton-demarrer").addEventListener("click", demarrerMatch);
$("bouton-rejouer").addEventListener("click", demarrerMatch);

function afficherEcran(nom) {
  Object.entries(ecrans).forEach(([cle, ecran]) => {
    ecran.classList.toggle("visible", cle === nom);
  });
}

function attendre(duree) {
  return new Promise((resolve) => setTimeout(resolve, duree));
}

function actualiserScores() {
  $("score-joueur").textContent = scoreJoueur;
  $("score-ordinateur").textContent = scoreOrdinateur;
  $("numero-manche").textContent = manche;
}

function activerBoutons(actifs) {
  boutons.forEach((bouton) => {
    bouton.disabled = !actifs;
  });
}

function retirerAnimations() {
  mainJoueur.className = "main-duel";
  mainOrdinateur.className = "main-duel";
  arene.classList.remove("impact");
}

async function demarrerMatch() {
  const version = ++versionMatch;

  cancelAnimationFrame(animationChrono);

  scoreJoueur = 0;
  scoreOrdinateur = 0;
  manche = 1;
  phase = "preparation";

  $("confettis").replaceChildren();
  actualiserScores();
  afficherEcran("jeu");
  retirerAnimations();
  afficherMains();

  activerBoutons(false);
  zoneBoutons.classList.remove("masques");

  boutons.forEach((bouton) => {
    bouton.classList.remove("selectionne");
  });

  progression.style.width = "100%";
  barreTemps.setAttribute("aria-valuenow", "5");
  message.className = "";
  message.textContent = "Le premier à 3 victoires remporte le match.";
  consigne.textContent = "PRÉPARE-TOI";

  for (let nombre = 3; nombre >= 1; nombre--) {
    compte.textContent = nombre;
    await attendre(650);
    if (version !== versionMatch) return;
  }

  lancerManche();
}

function lancerManche() {
  phase = "choix";

  retirerAnimations();
  afficherMains();
  actualiserScores();

  choixAdversaire =
    choixPossibles[Math.floor(Math.random() * choixPossibles.length)];

  message.className = "";
  message.textContent = "À toi de jouer !";
  consigne.textContent = "CHOISIS TON COUP";

  zoneBoutons.classList.remove("masques");

  boutons.forEach((bouton) => {
    bouton.classList.remove("selectionne");
  });

  activerBoutons(true);

  progression.style.background =
    "linear-gradient(90deg, #23c97a, #b1ff6b)";

  finChoix = performance.now() + dureeChoix;
  actualiserChrono();
}

function actualiserChrono() {
  if (phase !== "choix") return;

  const restant = Math.max(0, finChoix - performance.now());
  const secondes = Math.ceil(restant / 1000);

  compte.textContent = secondes;
  progression.style.width = `${(restant / dureeChoix) * 100}%`;
  barreTemps.setAttribute("aria-valuenow", secondes);

  if (restant <= 1500) {
    progression.style.background = "#ff526e";
  } else if (restant <= 3000) {
    progression.style.background = "#ffdb70";
  }

  if (restant <= 0) {
    terminerChoix(null);
    return;
  }

  animationChrono = requestAnimationFrame(actualiserChrono);
}

async function terminerChoix(choixJoueur) {
  if (phase !== "choix") return;

  phase = "animation";
  const version = versionMatch;
  const ordinateur = choixAdversaire;

  cancelAnimationFrame(animationChrono);
  activerBoutons(false);
  zoneBoutons.classList.add("masques");

  consigne.textContent = "LE DUEL COMMENCE";
  message.textContent = choixJoueur
    ? "Choix verrouillé. Place au duel !"
    : "Temps écoulé : cette manche est perdue.";

  afficherMains();
  mainJoueur.classList.add("secoue");
  mainOrdinateur.classList.add("secoue");

  for (const mot of ["PIERRE", "FEUILLE", "CISEAUX"]) {
    compte.textContent = mot;
    compte.style.fontSize = "clamp(14px, 2.5vw, 27px)";

    await attendre(450);
    if (version !== versionMatch) return;
  }

  retirerAnimations();
  afficherMains(choixJoueur || "pierre", ordinateur);

  if (!choixJoueur) {
    mainJoueur.style.opacity = "0.3";
  }

  mainJoueur.classList.add("revele");
  mainOrdinateur.classList.add("revele");
  arene.classList.add("impact");

  compte.style.fontSize = "";
  compte.textContent = "VS";

  const resultat = choixJoueur
    ? determinerResultat(choixJoueur, ordinateur)
    : "perdu";

  if (resultat === "gagne") {
    scoreJoueur++;
    message.className = "gagne";
    message.textContent = "Tu remportes la manche !";
  } else if (resultat === "perdu") {
    scoreOrdinateur++;
    message.className = "perdu";
    message.textContent = choixJoueur
      ? "L’ordinateur remporte la manche !"
      : "Trop tard ! Un point pour l’ordinateur.";
  } else {
    message.className = "egalite";
    message.textContent = "Égalité ! Aucun point attribué.";
  }

  actualiserScores();
  consigne.textContent = "RÉSULTAT DE LA MANCHE";

  await attendre(450);
  if (version !== versionMatch) return;

  if (resultat !== "egalite") {
    const gagnant = resultat === "gagne"
      ? mainJoueur
      : mainOrdinateur;

    gagnant.classList.remove("revele");
    gagnant.classList.add("vainqueur");
  }

  await attendre(1500);
  if (version !== versionMatch) return;

  mainJoueur.style.opacity = "";

  if (scoreJoueur >= objectif || scoreOrdinateur >= objectif) {
    terminerMatch();
    return;
  }

  manche++;
  lancerManche();
}

function determinerResultat(joueur, ordinateur) {
  if (joueur === ordinateur) return "egalite";

  const bat = {
    pierre: "ciseaux",
    feuille: "pierre",
    ciseaux: "feuille"
  };

  return bat[joueur] === ordinateur ? "gagne" : "perdu";
}

function terminerMatch() {
  phase = "fin";
  afficherEcran("fin");

  const victoire = scoreJoueur >= objectif;

  $("titre-fin").textContent = victoire
    ? "ARÈNE CONQUISE !"
    : "REVANCHE ?";

  $("titre-fin").style.color = victoire
    ? "#68f0aa"
    : "#ff8497";

  $("message-fin").textContent = victoire
    ? `Tu remportes le match ${scoreJoueur} à ${scoreOrdinateur}.`
    : `L’ordinateur remporte le match ${scoreOrdinateur} à ${scoreJoueur}.`;

  if (victoire) lancerConfettis();
}

function lancerConfettis() {
  const couleurs = ["#38caff", "#ff526e", "#ffdb70", "#68f0aa"];

  for (let i = 0; i < 85; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";

    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background =
      couleurs[Math.floor(Math.random() * couleurs.length)];
    confetti.style.animationDelay = `${Math.random() * 0.6}s`;
    confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";

    $("confettis").appendChild(confetti);
    setTimeout(() => confetti.remove(), 3500);
  }
}

afficherMains();
activerBoutons(false);