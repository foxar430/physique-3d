# Physique 3D

Ce site simule en 3D les expériences de physique du programme tunisien (lycée, bac). Le site est statique et gratuit, en français.

## Lancer en local

```bash
cd C:\Users\mehdi\Downloads\physique-3d
npm install
npm run dev
```

Puis ouvrir http://localhost:5180.

## Expériences disponibles (v0.2)

- **Dipôle RC** (`#/rc`) : charge et décharge, interrupteur K cliquable en 3D, porteurs de charge animés, effet Joule, voltmètre, courbes uC, uR et i avec repères τ, 0,63 E et 5τ.
- **Pendule élastique** (`#/ressort`) : oscillations libres non amorties ou amorties, flèches de force et de vitesse, courbes x(t) et énergies Ec, Ep, E.
- **Dipôle RL** (`#/rl`) : établissement et rupture du courant, bobine (L, r), courbes uR, uB et i avec τ = L/(R+r).
- **RLC libre** (`#/rlc-libre`) : décharge de C dans la bobine, régimes périodique, pseudo-périodique et apériodique, échange d'énergie entre C et L.
- **RLC forcé** (`#/rlc-force`) : GBF sinusoïdal, oscillogrammes u(t) et uR(t), courbe de résonance Im(N), déphasage, facteur de qualité.

Les trois circuits électriques et le RC partagent la même scène 3D, `src/components/three/Circuit.jsx`.

## Documentation

- [docs/INVENTAIRE.md](docs/INVENTAIRE.md) : expériences du programme, par niveau et par section, avec les sources et les points à confirmer.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : choix techniques validés.

## Ajouter une expérience

1. Créer le dossier `src/experiments/<id>/` avec `model.js` (physique), `Scene.jsx` (3D) et `index.jsx` (paramètres, courbes, cours).
2. Ajouter `load: lazy(() => import('./<id>/index.jsx'))` à l'entrée correspondante dans `src/experiments/registry.js`.
