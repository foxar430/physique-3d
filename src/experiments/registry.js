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
  { id: 'ressort-force', level: '4e', title: 'Pendule élastique : résonance', chapter: 'Système mécanique', icon: '🎚', load: lazy(() => import('./ressort-force/index.jsx')) },
  { id: 'ondes', level: '4e', title: 'Ondes progressives : cuve à ondes', chapter: 'Ondes', icon: '🌊', load: lazy(() => import('./ondes/index.jsx')) },
  { id: 'diffraction', level: '4e', title: 'Diffraction et dispersion de la lumière', chapter: 'Ondes', icon: '🔦', load: lazy(() => import('./diffraction/index.jsx')) },
  { id: 'spectre', level: '4e', title: 'Spectre atomique de l’hydrogène', chapter: 'Physique atomique', icon: '🌈', load: lazy(() => import('./spectre/index.jsx')) },
  { id: 'radioactivite', level: '4e', title: 'Radioactivité et décroissance', chapter: 'Physique nucléaire', icon: '☢', load: lazy(() => import('./radioactivite/index.jsx')) },
  { id: 'filtres', level: '4e', title: 'Filtres passe-bas / passe-haut (Sc. Tech.)', chapter: 'Filtres électriques', icon: '🎛', load: lazy(() => import('./filtres/index.jsx')) },
  // 3e année
  { id: 'projectile', level: '3e', title: 'Chute libre et projectile', chapter: 'Mouvement dans un champ', icon: '🏀', load: lazy(() => import('./projectile/index.jsx')) },
  { id: 'particule-e', level: '3e', title: 'Particule dans un champ électrique', chapter: 'Mouvement dans un champ', icon: '⊕', load: lazy(() => import('./particule-e/index.jsx')) },
  { id: 'particule-b', level: '3e', title: 'Particule dans un champ magnétique', chapter: 'Mouvement dans un champ', icon: '🌀', load: lazy(() => import('./particule-b/index.jsx')) },
  { id: 'champ-e', level: '3e', title: 'Interaction électrique : Coulomb, champ', chapter: 'Interactions', icon: '⚡', load: lazy(() => import('./champ-e/index.jsx')) },
  { id: 'magnetisme', level: '3e', title: 'Aimant, solénoïde, boussole', chapter: 'Interactions', icon: '🧭', load: lazy(() => import('./magnetisme/index.jsx')) },
  { id: 'gravitation', level: '3e', title: 'Gravitation : satellites', chapter: 'Interactions', icon: '🛰', load: lazy(() => import('./gravitation/index.jsx')) },
  { id: 'laplace', level: '3e', title: 'Force de Laplace : rails, roue de Barlow', chapter: 'Interactions', icon: '🛤', load: lazy(() => import('./laplace/index.jsx')) },
  { id: 'newton', level: '3e', title: 'Plan incliné : cinématique, Newton, énergie', chapter: 'Mouvements', icon: '📐', load: lazy(() => import('./newton/index.jsx')) },
  { id: 'rotation', level: '3e', title: 'Rotation : moment d’inertie', chapter: 'Mouvements', icon: '⚙', load: lazy(() => import('./rotation/index.jsx')) },
  { id: 'lentilles', level: '3e', title: 'Lentilles minces : banc d’optique, loupe', chapter: 'Optique', icon: '🔍', load: lazy(() => import('./lentilles/index.jsx')) },
  { id: 'aop', level: '3e', title: 'Amplificateur opérationnel (Sc. Tech.)', chapter: 'Électronique', icon: '🔺', load: lazy(() => import('./aop/index.jsx')) },
  // 2e année
  { id: 'dipoles', level: '2e', title: 'Dipôles : caractéristiques, loi de Pouillet', chapter: 'Électricité', icon: '🔌', load: lazy(() => import('./dipoles/index.jsx')) },
  { id: 'alternatif', level: '2e', title: 'Courant alternatif : l’oscilloscope', chapter: 'Électricité', icon: '∿', load: lazy(() => import('./alternatif/index.jsx')) },
  { id: 'equilibre', level: '2e', title: 'Équilibre : la table à forces', chapter: 'Mécanique', icon: '✳', load: lazy(() => import('./equilibre/index.jsx')) },
  { id: 'levier', level: '2e', title: 'Moment d’une force, levier', chapter: 'Mécanique', icon: '⚖', load: lazy(() => import('./levier/index.jsx')) },
  { id: 'mouvement', level: '2e', title: 'Mouvements : table à coussin d’air', chapter: 'Mécanique', icon: '🏒', load: lazy(() => import('./mouvement/index.jsx')) },
  { id: 'archimede', level: '2e', title: 'Pression, Archimède, Torricelli', chapter: 'Fluides', icon: '⚓', load: lazy(() => import('./archimede/index.jsx')) },
  { id: 'energie', level: '2e', title: 'Énergie mécanique et chaleur', chapter: 'Énergie', icon: '🔋', load: lazy(() => import('./energie/index.jsx')) },
  { id: 'refraction', level: '2e', title: 'Réflexion, réfraction, réflexion totale', chapter: 'Optique', icon: '💎', load: lazy(() => import('./refraction/index.jsx')) },
]

export const LEVELS = [
  { id: '4e', label: '4e année · Bac' },
  { id: '3e', label: '3e année' },
  { id: '2e', label: '2e année' },
]
