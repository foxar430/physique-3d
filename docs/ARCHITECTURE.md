# Architecture : Physique 3D

## Choix validés avec l'utilisateur (21/11/2026)

| Question | Choix |
|---|---|
| Langue | Français d'abord. Les textes restent séparés du code pour ajouter l'arabe plus tard. |
| Public | Élèves (révision seuls) et profs (projection en classe, avec un mode plein écran) |
| Hébergement | GitHub Pages : site 100 % statique, gratuit |
| Technique | Vite + React + Three.js (react-three-fiber + drei) |
| Budget | 0 € : aucun serveur, aucune API payante, aucune IA externe |

## Principes

1. **Physique exacte, celle du cours.** On n'utilise pas de moteur physique « jeu vidéo » (Rapier, Cannon). Chaque expérience intègre les équations du programme tunisien :
   - la solution analytique quand elle existe (RC : `uC = E(1 − e^(−t/τ))`) ;
   - sinon la méthode de Runge-Kutta d'ordre 4 (RK4, dans `src/lib/rk4.js`).
   Les valeurs affichées correspondent donc à ce que l'élève calcule au bac.
2. **Une expérience = un dossier.** Chaque dossier `src/experiments/<id>/` contient :
   - `model.js` : la physique pure, sans affichage, testable ;
   - `Scene.jsx` : la scène 3D ;
   - `index.jsx` : les paramètres, les courbes et le texte du cours.
   Le fichier `src/experiments/registry.js` liste les expériences avec leur niveau, leur section et leur chapitre.
3. **Une boucle de simulation unique.** Le hook `useSimulation` fait avancer le modèle à chaque image avec un facteur de vitesse (ralenti ou accéléré). Il offre aussi pause et réinitialisation. La 3D et les courbes lisent le même état, stocké dans une référence (ref) et non dans le state React, pour tenir 60 images/s.
4. **Courbes en temps réel.** Un petit composant `<LiveChart>` dessine sur un canvas. Il n'utilise aucune bibliothèque et se redessine à chaque image (requestAnimationFrame).
5. **Navigation par hash** (`#/rc`, `#/ressort`), compatible avec GitHub Pages sans configuration serveur.

## Arborescence

```
physique-3d/
├─ docs/              inventaire, architecture
├─ index.html
├─ vite.config.js     base relative pour GitHub Pages
└─ src/
   ├─ main.jsx, App.jsx, styles.css
   ├─ lib/            rk4.js, useSimulation.js
   ├─ components/     LiveChart, Slider, ExperimentLayout
   └─ experiments/
      ├─ registry.js
      ├─ rc/          dipôle RC (4e, Évolution de systèmes électriques)
      └─ ressort/     pendule élastique (4e, Évolution d'un système mécanique)
```

## Mise en ligne (plus tard)

```bash
npm run build
```

Cette commande produit le site statique dans `dist/`. On le publie ensuite sur GitHub Pages, à la main ou avec une GitHub Action.
