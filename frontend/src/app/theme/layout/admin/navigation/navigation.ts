export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  queryParams?: Record<string, unknown>;
  fragment?: string;
  classes?: string;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
  role?: string[];
  isMainParent?: boolean;
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Accueil',
    type: 'group',
    icon: 'ti ti-dashboard',
    children: [
      {
        id: 'admin-dashboard',
        title: 'Tableau de Bord Admin',
        type: 'item',
        url: '/admin',
        icon: 'feather icon-layout',
        breadcrumbs: false,
        role: ['ROLE_ADMIN']
      }
    ]
  },
  {
    id: 'admin-area',
    title: 'Administration',
    type: 'group',
    icon: 'feather icon-settings',
    role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'],
    children: [
      {
        id: 'risk-area',
        title: 'Risque',
        type: 'collapse',
        icon: 'feather icon-alert-triangle',
        breadcrumbs: false,
        role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'],
        children: [
          {
            id: 'risque-engagement',
            title: 'Risque Engagements',
            type: 'item',
            url: '/risque/engagement',
            icon: 'feather icon-trending-up',
            breadcrumbs: false,
            role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
          },
          {
            id: 'risque-patrimoines',
            title: 'Risque Patrimoines',
            type: 'item',
            url: '/risque/patrimoines',
            icon: 'feather icon-home',
            breadcrumbs: false,
            role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
          },
          {
            id: 'risque-garanties-nantissement',
            title: 'Garanties (Nantissement)',
            type: 'item',
            url: '/risque/garanties/nantissement',
            icon: 'feather icon-link',
            breadcrumbs: false,
            role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
          },
          {
            id: 'risque-garanties-hypotheque',
            title: 'Garanties (Hypothèque)',
            type: 'item',
            url: '/risque/garanties/hypotheque',
            icon: 'feather icon-map-pin',
            breadcrumbs: false,
            role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
          },
          {
            id: 'risque-garanties-cautions',
            title: 'Garanties (Cautions)',
            type: 'item',
            url: '/risque/garanties/cautions',
            icon: 'feather icon-shield',
            breadcrumbs: false,
            role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
          }
        ]
      },
      {
        id: 'contentieux-management',
        title: 'Gestion Dossier Contentieux',
        type: 'item',
        url: '/contentieux',
        icon: 'feather icon-folder',
        breadcrumbs: false,
        role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
      },
      {
        id: 'prestataire-management',
        title: 'Gestion des Prestataires',
        type: 'item',
        url: '/prestataires',
        icon: 'feather icon-briefcase',
        breadcrumbs: false,
        role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
      },
      {
        id: 'suivi-judiciaire',
        title: 'Suivi Judiciaire',
        type: 'item',
        url: '/suivi-judiciaire',
        icon: 'feather icon-book',
        breadcrumbs: false,
        role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
      },
      {
        id: 'mission-management',
        title: 'Gérer Missions',
        type: 'item',
        url: '/missions',
        icon: 'feather icon-check-square',
        breadcrumbs: false,
        role: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX']
      },
      {
        id: 'user-management',
        title: 'Gestion des Utilisateurs',
        type: 'item',
        url: '/users',
        icon: 'feather icon-users',
        breadcrumbs: false,
        role: ['ROLE_ADMIN']
      },
      {
        id: 'role-management',
        title: 'Gestion des Rôles',
        type: 'item',
        url: '/roles',
        icon: 'feather icon-shield',
        breadcrumbs: false,
        role: ['ROLE_ADMIN']
      }
    ]
  }
];
