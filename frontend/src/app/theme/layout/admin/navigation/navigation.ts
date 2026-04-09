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
