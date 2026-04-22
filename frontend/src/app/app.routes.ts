import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ResetPasswordConfirmComponent } from './reset-password-confirm/reset-password-confirm.component';
import { UserPageComponent } from './pages/user.component';
import { AdminPageComponent } from './pages/admin.component';
import { AuthGuard } from './auth/auth.guard';
import { DashboardPageComponent } from './pages/dashboard.component';
import { ContentieuxPageComponent } from './pages/contentieux.component';
import { RisqueEngagementPageComponent } from './pages/risque-engagement.component';
import { RisquePatrimoinesPageComponent } from './pages/risque-patrimoines.component';
import { RisqueGarantiesCautionsPageComponent } from './pages/risque-garanties-cautions.component';
import { RisqueGarantiesHypothequePageComponent } from './pages/risque-garanties-hypotheque.component';
import { RisqueGarantiesNantissementPageComponent } from './pages/risque-garanties-nantissement.component';
import { UsersPageComponent } from './pages/users.component';
import { RolesPageComponent } from './pages/roles.component';
import { PrestatairesPageComponent } from './pages/prestataires.component';
import { PrestataireDetailPageComponent } from './pages/prestataire-detail.component';
import { SuiviJudiciaireComponent } from './pages/suivi-judiciaire.component';
import { MissionsPageComponent } from './pages/missions.component';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';

import { ChangePasswordComponent } from './pages/profile/change-password.component';
import { RoleLandingPageComponent } from './pages/admin.component';
import { FacturesComponent } from './pages/factures/factures.component';
import { NotesHonorairesComponent } from './pages/notes-honoraires/notes-honoraires.component';

export const routes: Routes = [
  {
    path: '',
    component: GuestComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: 'reset-password/confirm', component: ResetPasswordConfirmComponent }
    ]
  },
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'admin', component: DashboardPageComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'contentieux', component: ContentieuxPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'risque/engagement', component: RisqueEngagementPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'risque/patrimoines', component: RisquePatrimoinesPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'risque/garanties', redirectTo: 'risque/garanties/nantissement', pathMatch: 'full' },
      { path: 'risque/garanties/nantissement', component: RisqueGarantiesNantissementPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'risque/garanties/hypotheque', component: RisqueGarantiesHypothequePageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'risque/garanties/cautions', component: RisqueGarantiesCautionsPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'user', component: UserPageComponent },
      { path: 'profile/change-password', component: ChangePasswordComponent },
      { path: 'users', component: UsersPageComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'roles', component: RolesPageComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'prestataires', component: PrestatairesPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'prestataires/:id', component: PrestataireDetailPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ROLE_PRESTATAIRE', 'ROLE_AVOCAT', 'ROLE_HUISSIER', 'ROLE_EXPERT', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT'] } },
      { path: 'suivi-judiciaire', component: SuiviJudiciaireComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX'] } },
      { path: 'missions', component: MissionsPageComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ROLE_PRESTATAIRE', 'ROLE_AVOCAT', 'ROLE_HUISSIER', 'ROLE_EXPERT', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT'] } },
      { path: 'factures', component: FacturesComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ROLE_PRESTATAIRE', 'ROLE_AVOCAT', 'ROLE_HUISSIER', 'ROLE_EXPERT', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT'] } },
      { path: 'notes-honoraires', component: NotesHonorairesComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ROLE_PRESTATAIRE', 'ROLE_AVOCAT', 'ROLE_HUISSIER', 'ROLE_EXPERT', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT'] } },
      { path: '', component: RoleLandingPageComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
