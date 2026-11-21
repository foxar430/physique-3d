import { lazy } from 'react'

/**
 * Catalogue des expériences. `load` absent = prévue, pas encore réalisée.
 * Voir docs/INVENTAIRE.md pour la source (manuels CNP).
 */
export const EXPERIMENTS = [
  // 4e année
  { id: 'rc', level: '4e', title: 'Dipôle RC : charge et décharge', chapter: 'Systèmes électriques', icon: '⚡', load: lazy(() => import('./rc/index.jsx')) },
  { id: 'ressort', level: '4e', title: 'Pendule élastique : oscillations libres', chapter: 'Système mécanique', icon: '〰', load: lazy(() => import('./ressort/index.jsx')) },
  { id: 'rl', level: '4e', title: 'Dipôle RL : établissement du courant', chapter: 'Systèmes électriques', icon: '🧲', load: lazy(() => import('./rl/index.jsx')) },
  { id: 'rlc-libre', level: '4e', title: 'RLC : oscillations libres amorties', chapter: 'Systèmes électriques', icon: '∿', load: lazy(() => import('./rlc-libre/index.jsx')) },
  { id: 'rlc-force', level: '4e', title: 'RLC forcé : résonance d’intensité', chapter: 'Systèmes électriques', icon: '📈', load: lazy(() => import('./rlc-force/index.jsx')) },
  { id: 'ressort-force', level: '4e', title: 'Pendule élastique : résonance', chapter: 'Système mécanique', icon: '🎚' },
  { id: 'ondes', level: '4e', title: 'Ondes progressives (corde, cuve à ondes)', chapter: 'Ondes', icon: '🌊' },
  { id: 'diffraction', level: '4e', title: 'Diffraction de la lumière', chapter: 'Ondes', icon: '🔦' },
  { id: 'spectre', level: '4e', title: 'Spectre atomique de l’hydrogène', chapter: 'Physique atomique', icon: '🌈' },
  { id: 'radioactivite', level: '4e', title: 'Radioactivité et décroissance', chapter: 'Physique nucléaire', icon: '☢' },
  { id: 'filtres', level: '4e', title: 'Filtres passe-bas / passe-haut (Sc. Tech.)', chapter: 'Filtres électriques', icon: '🎛' },
  // 3e année
  { id: 'projectile', level: '3e', title: 'Chute libre et projectile', chapter: 'Mouvement dans un champ', icon: '🏀' },
  { id: 'particule-e', level: '3e', title: 'Particule dans un champ électrique', chapter: 'Mouvement dans un champ', icon: '⊕' },
  { id: 'particule-b', level: '3e', title: 'Particule dans un champ magnétique', chapter: 'Mouvement dans un champ', icon: '🌀' },
  { id: 'laplace', level: '3e', title: 'Rails de Laplace', chapter: 'Interactions', icon: '🛤' },
  { id: 'newton', level: '3e', title: '2e loi de Newton : plan incliné', chapter: 'Dynamique', icon: '📐' },
  { id: 'lentilles', level: '3e', title: 'Lentilles minces : banc d’optique', chapter: 'Optique', icon: '🔍' },
  // 2e année
  { id: 'archimede', level: '2e', title: 'Poussée d’Archimède', chapter: 'Fluides', icon: '⚓' },
  { id: 'refraction', level: '2e', title: 'Réfraction et réflexion totale', chapter: 'Optique', icon: '💎' },
  { id: 'levier', level: '2e', title: 'Moment d’une force, levier', chapter: 'Équilibre', icon: '⚖' },
]

export const LEVELS = [
  { id: '4e', label: '4e année · Bac' },
  { id: '3e', label: '3e année' },
  { id: '2e', label: '2e année' },
]
