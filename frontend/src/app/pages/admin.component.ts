import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, CardComponent, RouterModule],
  template: `
    <div class="row">
      <div class="col-md-12 col-xl-8">
        <app-card cardTitle="Avis Clients Récents" [options]="false">
          <div class="media mb-4" *ngFor="let review of reviews">
            <img class="img-radius img-fluid wid-40 m-r-15" [src]="review.avatar" alt="User image">
            <div class="media-body">
              <h6 class="mb-1">{{ review.name }} <span class="text-muted float-right f-13">{{ review.date }}</span></h6>
              <div class="text-warning mb-2">
                <i class="fa fa-star" *ngFor="let star of [1,2,3,4,5]" [ngClass]="{'text-muted': star > review.stars}"></i>
              </div>
              <p class="text-muted mb-0">{{ review.text }}</p>
              <div class="mt-2">
                <a href="javascript:" class="m-r-15 text-muted"><i class="feather icon-thumbs-up m-r-5"></i>Utile?</a>
                <a href="javascript:" class="text-muted"><i class="feather icon-heart m-r-5"></i>J'aime</a>
                <a href="javascript:" class="text-muted float-right"><i class="feather icon-edit m-r-5"></i>Répondre</a>
              </div>
            </div>
            <hr *ngIf="!isLast(review)" class="my-4">
          </div>
        </app-card>
      </div>
      <div class="col-md-12 col-xl-4">
        <app-card cardTitle="Actions Rapides" [options]="false">
          <div class="d-grid gap-2">
            <button [routerLink]="['/users']" class="btn btn-primary btn-block mb-2 text-left">
              <i class="feather icon-user-plus m-r-10"></i> Créer un Utilisateur
            </button>
            <button class="btn btn-outline-success btn-block mb-2 text-left">
              <i class="feather icon-file-plus m-r-10"></i> Nouveau Dossier
            </button>
            <button class="btn btn-outline-info btn-block text-left">
              <i class="feather icon-settings m-r-10"></i> Paramètres Système
            </button>
          </div>
        </app-card>

        <app-card cardTitle="Résumé du Système" [options]="false">
          <div class="row align-items-center justify-content-center">
            <div class="col-auto">
              <i class="feather icon-users f-30 text-primary"></i>
            </div>
            <div class="col text-right">
              <h3 class="mb-0">12</h3>
              <span class="text-muted">Utilisateurs Actifs</span>
            </div>
          </div>
          <hr>
          <div class="row align-items-center justify-content-center">
            <div class="col-auto">
              <i class="feather icon-file-text f-30 text-success"></i>
            </div>
            <div class="col text-right">
              <h3 class="mb-0">45</h3>
              <span class="text-muted">Dossiers Ouverts</span>
            </div>
          </div>
          <hr>
          <div class="row align-items-center justify-content-center">
            <div class="col-auto">
              <i class="feather icon-alert-circle f-30 text-danger"></i>
            </div>
            <div class="col text-right">
              <h3 class="mb-0">3</h3>
              <span class="text-muted">Alertes Critiques</span>
            </div>
          </div>
        </app-card>

        <app-card cardTitle="Derniers Utilisateurs" [options]="false">
          <div class="table-responsive">
            <table class="table table-hover table-borderless mb-0">
              <tbody>
                <tr *ngFor="let user of recentUsers">
                  <td>
                    <h6 class="mb-1">{{ user.name }}</h6>
                    <p class="text-muted mb-0">{{ user.role }}</p>
                  </td>
                  <td class="text-right">
                    <span class="badge" [ngClass]="user.status === 'Actif' ? 'badge-light-success' : 'badge-light-danger'">{{ user.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="text-center mt-3">
            <a [routerLink]="['/users']" class="text-primary">Voir tous les utilisateurs</a>
          </div>
        </app-card>
      </div>
    </div>
  `
})
export class AdminPageComponent implements OnInit {
  reviews = [
    {
      name: 'Imen maalaoui',
      date: 'il y a une semaine',
      stars: 4,
      avatar: 'assets/images/user/avatar-1.jpg',
      text: 'Le suivi du dossier contentieux est beaucoup plus simple avec cette nouvelle interface. Très réactif.'
    },
    {
      name: 'Mahdi Baccouche',
      date: 'il y a 3 jours',
      stars: 5,
      avatar: 'assets/images/user/avatar-2.jpg',
      text: 'Excellente plateforme. La gestion des prestataires est fluide et transparente.'
    }
  ];

  recentUsers = [
    { name: 'Admin BNA', role: 'Administrateur', status: 'Actif' },
    { name: 'Sami Ben Ali', role: 'Chargé de Dossier', status: 'Actif' },
    { name: 'Amel Karoui', role: 'Responsable Contentieux', status: 'Inactif' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {}

  isLast(review: any) {
    return this.reviews.indexOf(review) === this.reviews.length - 1;
  }
}