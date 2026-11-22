# Physique 3D

Ce site simule en 3D les expériences de physique du programme tunisien (lycée, bac). Le site est statique et gratuit, en français.

**En ligne : https://foxar430.github.io/physique-3d/**

## Lancer en local

```bash
cd C:\Users\mehdi\Downloads\physique-3d
npm install
npm run dev
```

Puis ouvrir http://localhost:5180.

## Expériences disponibles (v0.4) : tout le programme de 4e année

- **Dipôle RC** (`#/rc`) : charge et décharge, interrupteur K cliquable en 3D, porteurs de charge animés, effet Joule, voltmètre, courbes uC, uR et i avec repères τ, 0,63 E et 5τ.
- **Pendule élastique** (`#/ressort`) : oscillations libres non amorties ou amorties, flèches de force et de vitesse, courbes x(t) et énergies Ec, Ep, E.
- **Dipôle RL** (`#/rl`) : établissement et rupture du courant, bobine (L, r), courbes uR, uB et i avec τ = L/(R+r).
- **RLC libre** (`#/rlc-libre`) : décharge de C dans la bobine, régimes périodique, pseudo-périodique et apériodique, échange d'énergie entre C et L.
- **RLC forcé** (`#/rlc-force`) : GBF sinusoïdal, oscillogrammes u(t) et uR(t), courbe de résonance Im(N), déphasage, facteur de qualité.
- **Cuve à ondes** (`#/ondes`) : pointe (ondes circulaires) ou réglette (rectilignes), onde entretenue ou ébranlement, bouchon flottant en M, règle graduée, image projetée sur l'écran, stroboscope (immobilité apparente, mouvement ralenti), courbes y_S(t), y_M(t) et aspect de la surface.
- **Pendule élastique forcé** (`#/ressort-force`) : banc à coussin d'air, excitateur à bielle, amortisseur à huile, courbes de résonance d'élongation Xm(N) et de vitesse Vm(N), analogie électrique-mécanique.
- **Diffraction et dispersion** (`#/diffraction`) : laser, fente réglable, figure sur l'écran gradué, relevé de mesures et droite θ = f(1/a) ; prisme en verre flint avec lumière blanche ou laser, n(λ) et déviation D(λ).
- **Spectre de l'hydrogène** (`#/spectre`) : tube à décharge, spectroscope à réseau, spectres d'émission et d'absorption, niveaux d'énergie animés, diagramme cliquable, absorption d'un photon d'énergie W.
- **Radioactivité** (`#/radioactivite`) : 512 noyaux, désintégrations aléatoires α, β⁻, β⁺, γ, compteur Geiger, écrans papier/aluminium/plomb, N(t), ln N(t), courbe d'Aston.
- **Filtres RC** (`#/filtres`, Sc. Tech.) : passe-bas et passe-haut, oscillogrammes uE et uS, diagramme de Bode, fréquence de coupure.

## Expériences de 3e année

- **Projectile** (`#/projectile`) : chute libre et tir parabolique sur Terre, Mars ou la Lune, vecteurs vitesse, chronophotographie, portée et flèche.
- **Particule dans un champ électrique** (`#/particule-e`) : canon à électrons, plaques de déviation, écran fluorescent, Y = L·D·U/(2·d·U₀).
- **Particule dans un champ magnétique** (`#/particule-b`) : faisceau d'électrons dans des bobines de Helmholtz, spectrographe de masse (isotopes du néon), cyclotron.
- **Interaction électrique** (`#/champ-e`) : lignes de champ (une charge, dipôle, condensateur plan), vecteur champ en un point, loi de Coulomb, pendule électrostatique.
- **Interaction magnétique** (`#/magnetisme`) : spectre d'un aimant droit et d'un solénoïde, aiguilles aimantées, boussole et tan α = B/B_H.
- **Gravitation** (`#/gravitation`) : satellites (ISS, GPS, géostationnaire, Lune), g(h), 3e loi de Kepler.
- **Force de Laplace** (`#/laplace`) : rails de Laplace et roue de Barlow.
- **Plan incliné** (`#/newton`) : cinématique, chronophotographie, 2e loi de Newton, théorème de l'énergie cinétique.
- **Rotation** (`#/rotation`) : moment d'inertie J = J₀ + 2Md², ω(t).
- **Lentilles minces** (`#/lentilles`) : banc d'optique, tracé des rayons, image sur l'écran (nette ou floue), loupe.
- **Amplificateur opérationnel** (`#/aop`, Sc. Tech.) : inverseur, non inverseur, suiveur, sommateur, comparateur, saturation, oscilloscope.

## Expériences de 2e année

- **Dipôles** (`#/dipoles`) : caractéristiques U(I) d'un résistor, d'une lampe, d'une diode, d'un moteur et d'une pile, relevé de points, puissance, loi de Pouillet et point de fonctionnement.
- **Courant alternatif** (`#/alternatif`) : GBF et oscilloscope réglable (sensibilité, balayage), signaux sinusoïdal, triangulaire, carré, continu, valeur efficace.
- **Table à forces** (`#/equilibre`) : équilibre d'un anneau soumis à trois forces, polygone des forces.
- **Levier** (`#/levier`) : moments des forces, théorème des moments, dynamomètre.
- **Mouvements** (`#/mouvement`) : table à coussin d'air, MRU, MRUV, circulaire uniforme, enregistrement toutes les 40 ms.
- **Fluides** (`#/archimede`) : poussée d'Archimède au dynamomètre, pression dans un liquide (capsule et manomètre), expérience de Torricelli.
- **Énergie** (`#/energie`) : pendule simple et chute avec rebonds, Ec, Ep, Em et chaleur Q.
- **Optique** (`#/refraction`) : disque gradué, miroir plan, réfraction air → plexiglas, réflexion totale.

Les trois circuits électriques et le RC partagent la même scène 3D, `src/components/three/Circuit.jsx`.

## Documentation

- [docs/INVENTAIRE.md](docs/INVENTAIRE.md) : expériences du programme, par niveau et par section, avec les sources et les points à confirmer.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : choix techniques validés.

## Ajouter une expérience

1. Créer le dossier `src/experiments/<id>/` avec `model.js` (physique), `Scene.jsx` (3D) et `index.jsx` (paramètres, courbes, cours).
2. Ajouter `load: lazy(() => import('./<id>/index.jsx'))` à l'entrée correspondante dans `src/experiments/registry.js`.
