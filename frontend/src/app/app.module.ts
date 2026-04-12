import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { LoginComponent } from './login/login.component';
import { UserPageComponent } from './pages/user.component';
import { AdminPageComponent } from './pages/admin.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { DashboardPageComponent } from './pages/dashboard.component';
import { UsersPageComponent } from './pages/users.component';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { SpinnerComponent } from './theme/shared/components/spinner/spinner.component';
import { CardComponent } from './theme/shared/components/card/card.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SuiviJudiciaireComponent } from './pages/suivi-judiciaire.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot(routes),
    AdminComponent,
    GuestComponent,
    SpinnerComponent,
    CardComponent,
    LoginComponent,
    UserPageComponent,
    AdminPageComponent,
    DashboardPageComponent,
    UsersPageComponent,
    RegisterComponent,
    ResetPasswordComponent,
    SuiviJudiciaireComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}